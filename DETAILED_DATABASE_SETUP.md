# Google Cloud SQL Database Setup - Complete Guide

## आपके लिए Recommended Configuration:

```
Database Type: PostgreSQL 15
Instance Type: db-f1-micro (free tier eligible)
Region: asia-south1 (Mumbai - भारत में fastest)
Zone: asia-south1-a
Storage: 10 GB (expandable to 250 GB free)
Backup: Automatic (7 days retention)
Availability: Single zone (शुरुआत में काफी है)
```

---

## Step 1: Google Cloud Console खोलें

1. https://console.cloud.google.com खोलें
2. अपना Google Account से login करें
3. **Dairy Walla** project select करें (या नया बनाएं)

---

## Step 2: Cloud SQL API Enable करें

1. बाएं sidebar में जाएं → **APIs & Services**
2. **Enable APIs and Services** पर click करें
3. Search करें: `Cloud SQL Admin API`
4. Click करके **Enable** करें

⏳ यह 30 सेकंड में complete हो जाएगा

---

## Step 3: Cloud SQL Instance Create करें

### 3.1 Instance Creation Page खोलें
1. बाएं sidebar में **Cloud SQL** खोलें
2. **Create Instance** button पर click करें
3. **Choose PostgreSQL** select करें

### 3.2 Configuration भरें

```
┌─────────────────────────────────────────┐
│ INSTANCE ID                             │
│ dairy-db-prod                           │
│ (यह unique होना चाहिए)                   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ PASSWORD FOR ROOT USER                  │
│ ••••••••••                              │
│ (secure password बनाएं, कहीं safe रखें) │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ DATABASE VERSION                        │
│ PostgreSQL 15                           │
│ (सबसे stable और latest)                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ REGION                                  │
│ asia-south1 (Mumbai)                    │
│ (भारत में fastest server)              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ZONAL AVAILABILITY                      │
│ Single zone (asia-south1-a)             │
│ (शुरुआत के लिए काफी है)                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ MACHINE TYPE                            │
│ db-f1-micro                             │
│ (0.6 vCPU, 614 MB RAM - free tier)     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ STORAGE TYPE                            │
│ SSD (Recommended)                       │
│ Or: HDD (cheaper but slower)            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ STORAGE CAPACITY                        │
│ 10 GB (auto-expandable)                 │
│ (डेटा बढ़ने पर automatically बढ़ेगा)     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ BACKUPS                                 │
│ Automated backups: ON                   │
│ Backup location: Automatic              │
│ Transaction log retention: 7 days       │
└─────────────────────────────────────────┘
```

### 3.3 Advanced Options (Optional)

```
Flag name: cloudsql_iam_authentication
Value: off

Flag name: max_connections
Value: 100 (dairy-walla के लिए काफी है)

Flag name: shared_buffers
Value: 16384 (default - बदलने की जरूरत नहीं)
```

### 3.4 Connectivity Settings

```
Public IP: Enable ✓
  (आपका server remote से connect करेगा)

Private IP: Optional
  (अगर VPC है तो enable करें)

Authorized networks:
  - अपना server IP add करें
  - Or: 0.0.0.0/0 (सिर्फ testing के लिए)
```

---

## Step 4: CREATE INSTANCE पर Click करें

- **CREATE** button पर click करें
- Instance create होने में **5-10 मिनट** लगते हैं
- Green checkmark आ जाएगा जब complete हो

---

## Step 5: Database Create करें

Instance create होने के बाद:

1. Instance के नाम पर click करें
2. **Databases** tab खोलें
3. **Create database** button पर click करें

```
Database name: dairy_walla_db
Character set: utf8mb4
Collation: default
```

✅ **Create** पर click करें

---

## Step 6: Connection String प्राप्त करें

1. Instance के page पर जाएं
2. **"Connection details"** section देखें
3. कुछ ऐसा दिखेगा:

```
Public IP Address: 34.131.XXXX.XXXX
Database: dairy_walla_db
User: postgres
Port: 5432
Password: [आपका password]
```

---

## Step 7: Connection String बनाएं

अपने `.env` file में यह add करें:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_PUBLIC_IP:5432/dairy_walla_db"
```

**उदाहरण:**
```env
DATABASE_URL="postgresql://postgres:MySecurePass123@34.131.45.67:5432/dairy_walla_db"
```

---

## Step 8: Connection Test करें

```bash
# अपने dairy-setu folder में जाएं
cd dairy-setu

# .env file update करें
# DATABASE_URL को नए value से replace करें

# Prisma को sync करें
npx prisma db push

# अगर कोई error न आए तो ✅ सफल है!
npm run build:api
```

---

## 🔒 Security Setup (बहुत Important!)

### Step 1: IP Whitelist करें
1. Instance के **Connections** tab में जाएं
2. **Add a network** पर click करें
3. अपने server का IP add करें
   ```
   Name: dairy-server
   Network: YOUR_SERVER_IP/32
   ```
4. **Save** करें

### Step 2: SSL Connection Enable करें
1. **SSL connections** section खोलें
2. **"Require SSL connection"** toggle ON करें
3. Client certificate download करें (अगर जरूरत हो)

### Step 3: User Permissions Restrict करें (Advanced)
```sql
-- Root user को safe रखें
-- अलग read-only user बनाएं (अगर जरूरत हो)

CREATE USER dairy_app WITH PASSWORD 'app_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dairy_app;
```

---

## 📊 Instance Details Summary

```
Instance Name: dairy-db-prod
Type: PostgreSQL 15
Machine: db-f1-micro
Region: asia-south1 (Mumbai)
Storage: 10 GB (Auto-expandable)
Availability: Single zone
Backups: Automatic (7 days)

Connection Info:
├── Public IP: 34.xxx.xxx.xxx
├── Port: 5432
├── User: postgres
├── Database: dairy_walla_db
└── URL: postgresql://postgres:PASSWORD@IP:5432/dairy_walla_db
```

---

## 💰 Cost Breakdown

```
Monthly Charges:
├── Compute (db-f1-micro): ₹800-900
├── Storage (10 GB): ₹100-150
├── Backup: Free
└── Total: ~₹1,000/month

Your Credits: ₹945.51
Free Tier: 250 GB/month data processing

Duration with Free Tier: ~10-11 months ✅
```

---

## ✅ Verification Checklist

- [ ] Cloud SQL API enabled
- [ ] PostgreSQL 15 instance created (dairy-db-prod)
- [ ] Database created (dairy_walla_db)
- [ ] Public IP obtained
- [ ] IP whitelist configured
- [ ] SSL enabled
- [ ] .env file updated with connection string
- [ ] `npx prisma db push` successful
- [ ] Database tables created (check with: `npx prisma db seed`)

---

## 🚀 अगले Steps

1. ✅ Database create करें (यह guide follow करके)
2. ✅ Supabase से backup लें (अगर पहले से data है)
3. ✅ Data migrate करें
4. ✅ Application test करें
5. ✅ Production में deploy करें

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection refused" | IP whitelist में अपना IP add करें |
| "Database does not exist" | Dashboard से verify करें database बना है |
| "Authentication failed" | Password check करें, special chars हो सकते हैं |
| "Operation timed out" | Network connectivity check करें |

---

## Important Notes

⚠️ **Password को safe place पर save करें** (1Password, LastPass, etc.)
⚠️ **Public IP को carefully manage करें** - सिर्फ trusted IPs add करें
⚠️ **SSL को always enable रखें** - encrypted connection के लिए
⚠️ **Backups automatically होंगी** - कोई extra action नहीं

---

## Resources

- [Google Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [PostgreSQL 15 Official Docs](https://www.postgresql.org/docs/15/)
- [Prisma + PostgreSQL Guide](https://www.prisma.io/docs/orm/overview/databases/postgresql)
