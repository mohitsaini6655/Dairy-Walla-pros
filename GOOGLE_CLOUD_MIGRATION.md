# Google Cloud में Database Migration Guide

## आपकी स्थिति:
- **Current Database**: Supabase (PostgreSQL)
- **Target**: Google Cloud SQL (PostgreSQL)
- **Billing Account**: Account 1 (₹945.51 credits available - May 8, 2026 to May 8, 2027)
- **Framework**: Prisma ORM

---

## Step 1: Google Cloud Project Setup (सही Billing Account के साथ)

### 1.1 नया Project Create करें
1. [Google Cloud Console](https://console.cloud.google.com) खोलें
2. Top में **Project Selector** पर click करें
3. **"New Project"** पर click करें
4. Project name: `dairy-walla-prod` (या कोई नाम)
5. **Create** पर click करें

### 1.2 Billing Account को Link करें
1. नए project में जाएं
2. **Billing** (बाएं sidebar में) पर click करें
3. **"Link a billing account"** पर click करें
4. **Billing Account 1** select करें (जहाँ ₹945.51 credits हैं)
5. **Set Account** पर click करें

✅ **Verify करें**: Billing page पर आपको ₹945.51 credits दिखनी चाहिए

---

## Step 2: Google Cloud SQL Instance Create करें

### 2.1 Cloud SQL API Enable करें
1. Google Cloud Console में जाएं
2. **Enabled APIs & services** खोलें (बाएं sidebar में)
3. **"Enable APIs and Services"** पर click करें
4. Search करें: `Cloud SQL Admin API`
5. Click करके **Enable** करें

### 2.2 PostgreSQL Instance Create करें
1. बाएं sidebar में **Cloud SQL** खोलें
2. **Create Instance** पर click करें
3. **Choose PostgreSQL** select करें
4. Settings:
   ```
   Instance ID: dairy-db-prod
   Password for root user: (एक secure password सेट करें)
   Database version: PostgreSQL 15
   Region: asia-south1 (Mumbai) - भारत के लिए nearest
   Zonal availability: Single zone (शुरुआत के लिए काफी है)
   ```
5. **CREATE INSTANCE** पर click करें

⏳ **इंतजार करें**: Instance create होने में 5-10 मिनट लगते हैं

### 2.3 Database Create करें
1. Instance create होने के बाद उस पर click करें
2. **"Databases"** tab खोलें
3. **Create database** पर click करें
4. Database name: `dairy_walla_db`
5. **Create** पर click करें

---

## Step 3: Supabase से Data Export करें (Optional - अगर पहले से data है)

### 3.1 Supabase से PostgreSQL Dump लें
```bash
# Supabase का connection string सेट करें
$env:SUPABASE_DB_URL = "postgresql://postgres:[password]@[host]:[port]/postgres"

# Backup लें
pg_dump $env:SUPABASE_DB_URL > supabase_backup.sql
```

### 3.2 Google Cloud SQL में Restore करें
1. आपके `.env` में नया DATABASE_URL set करें (नीचे देखें)
2. Restore करें:
```bash
psql $env:NEW_DATABASE_URL < supabase_backup.sql
```

---

## Step 4: आपकी Application में Connection Update करें

### 4.1 Google Cloud से Connection String प्राप्त करें
1. Google Cloud Console में Cloud SQL instance खोलें
2. **"Connection details"** देखें
3. कुछ ऐसा दिखेगा:
```
Public IP: 34.xxx.xxx.xxx
Database: dairy_walla_db
User: postgres
Password: [your-password]
Port: 5432
```

### 4.2 .env File Update करें
```env
# पुरानी (Supabase):
# DATABASE_URL="postgresql://[user]:[password]@[supabase-host]/[db]"

# नई (Google Cloud SQL):
DATABASE_URL="postgresql://postgres:[password]@[GOOGLE_CLOUD_IP]:5432/dairy_walla_db"
```

**उदाहरण:**
```env
DATABASE_URL="postgresql://postgres:MySecurePass123@34.131.45.67:5432/dairy_walla_db"
```

### 4.3 Prisma को नए Database से Connect करें
```bash
cd dairy-setu

# Introspect करें (अगर पहले से data है)
npx prisma db push

# या फ्रेश setup करें
npx prisma migrate dev --name init
```

---

## Step 5: Connection Security (Important!)

### 5.1 Public IP से Access को Restrict करें
1. Cloud SQL instance खोलें
2. **Connections** tab में जाएं
3. **"Add a network"** करें
   - सिर्फ अपने server का IP add करें
   - या VPC connection setup करें (advanced)

### 5.2 SSL/TLS Enable करें
1. **SSL connections** सेक्शन खोलें
2. **"Require SSL connection"** enable करें
3. Client certificate download करें (अगर जरूरत हो)

---

## Step 6: Environment Variables Setup

अपने server पर (Render या अन्य hosting):

```bash
# .env file (server पर)
DATABASE_URL="postgresql://postgres:[password]@[GOOGLE_CLOUD_IP]:5432/dairy_walla_db"
NODE_ENV="production"
```

---

## Step 7: Testing करें

```bash
cd dairy-setu

# Connection test करें
npm run build:api

# अगर error न आए, तो सफल है!
# Database queries करके verify करें:
npm run start:api
```

---

## Cost Estimate

**आपके Credits से कितना खर्च होगा:**

| Service | Usage | Monthly Cost |
|---------|-------|-------------|
| **Cloud SQL** (db-f1-micro) | 24/7 | ₹1,200-1,500 |
| **Storage** | 10GB | ₹100-200 |
| **Backup** | Auto | Free (1 week retention) |
| **Total** | | ~₹1,500/month |

**आपके credits (₹945.51) कितने दिन चलेंगे:**
- लगभग **18-20 दिन** free में
- उसके बाद regular billing शुरू होगी

---

## Troubleshooting

### "Connection refused" Error
- Check: क्या Google Cloud IP firewall में है?
- Check: क्या password सही है?
- Check: क्या region और IP match हो रहे हैं?

### "Database does not exist" Error
- Cloud SQL में जाकर verify करें कि database create हुआ है

### Slow Queries
- Cloud SQL के performance को monitor करें
- **Insights** tab में check करें

---

## अगले Steps

1. ✅ Google Cloud project बनाएं (सही billing account के साथ)
2. ✅ Cloud SQL PostgreSQL instance बनाएं
3. ✅ Connection string अपने `.env` में update करें
4. ✅ Prisma को new database से sync करें
5. ✅ Tests चलाएं

---

**Need help?** 
- [Google Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Prisma + PostgreSQL Guide](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases-typescript-postgres)
