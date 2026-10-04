# 🚀 Google Cloud SQL Database - Complete Prompt (Step-by-Step)

## आपको करना है (सब कुछ detailed):

---

## Phase 1: Google Cloud Console Setup (5 minutes)

### Step 1.1: Google Cloud खोलें
```
👉 https://console.cloud.google.com खोलें
   अपने Google Account से login करें
   Dairy Walla project select करें
```

### Step 1.2: Cloud SQL API Enable करें
```
बाएं sidebar में जाएं:
  ↓
  APIs & Services
  ↓
  Enable APIs and Services (button)
  ↓
  Search box में लिखें: "Cloud SQL Admin API"
  ↓
  पहले result पर click करें
  ↓
  ENABLE button पर click करें
  ↓
  ⏳ 30 सेकंड wait करें (enable हो जाएगा)
```

---

## Phase 2: Cloud SQL Instance Create करें (10 minutes)

### Step 2.1: Create Instance Page खोलें
```
बाएं sidebar में:
  ↓
  Cloud SQL (click करें)
  ↓
  CREATE INSTANCE button (blue button)
  ↓
  PostgreSQL को select करें (सबसे पहला option)
```

### Step 2.2: Form भरें - सब Values

```
╔════════════════════════════════════════════════════════════╗
║                 FORM FIELD 1                               ║
║ Instance ID *                                              ║
╠════════════════════════════════════════════════════════════╣
║ dairy-db-prod                                              ║
║ (यह नाम आपका instance का होगा - बदलना मत)               ║
╚════════════════════════════════════════════════════════════╝

👉 Type करो: dairy-db-prod
```

```
╔════════════════════════════════════════════════════════════╗
║                 FORM FIELD 2                               ║
║ Password for root user *                                   ║
╠════════════════════════════════════════════════════════════╣
║ ••••••••••                                                 ║
║ (Strong password बनाओ - कहीं note करो!)                   ║
╚════════════════════════════════════════════════════════════╝

👉 Password बनाओ (कम से कम 8 characters):
   Example: MyDairy@2024Prod123
   
   ⚠️ MUST DO: यह password कहीं safe रखो!
   - Notepad में लिख लो अभी के लिए
   - फिर 1Password/LastPass में store करो
```

```
╔════════════════════════════════════════════════════════════╗
║                 FORM FIELD 3                               ║
║ Database version                                           ║
╠════════════════════════════════════════════════════════════╣
║ PostgreSQL 15                                              ║
║ (dropdown से select करो)                                  ║
╚════════════════════════════════════════════════════════════╝

👉 Dropdown click करो → PostgreSQL 15 select करो
```

```
╔════════════════════════════════════════════════════════════╗
║                 FORM FIELD 4                               ║
║ Region                                                     ║
╠════════════════════════════════════════════════════════════╣
║ asia-south1 (Mumbai)                                       ║
║ (भारत में सबसे पास)                                      ║
╚════════════════════════════════════════════════════════════╝

👉 Dropdown click करो → asia-south1 (Mumbai) select करो
```

```
╔════════════════════════════════════════════════════════════╗
║                 FORM FIELD 5                               ║
║ Zonal availability                                         ║
╠════════════════════════════════════════════════════════════╣
║ Single zone                                                ║
║ (शुरुआत के लिए काफी है)                                  ║
╚════════════════════════════════════════════════════════════╝

👉 "Single zone" radio button select करो
```

### Step 2.3: Machine Type Change करो (IMPORTANT!)

```
बाएं हाथ देखो:
  ↓
  "Customize your instance" section मिलेगा
  ↓
  "Machine type" के आगे dropdown है
  ↓
  Click करो और "db-f1-micro" select करो
  
⚠️ यह free tier है - monthly ₹800-900 बचेगा!
```

### Step 2.4: Storage Configuration

```
यहाँ देखो:
  ↓
  Storage type: SSD (पहले से selected होगा - ठीक है)
  Storage capacity: 10 GB (default - ठीक है)
  
  ✅ Auto-expansion को ON रहने दो
     (यह automatically data बढ़ने पर increase करेगा)
```

### Step 2.5: Connectivity Setup (सबसे Important!)

```
बाएं हाथ नीचे scroll करो:
  ↓
  "Connectivity" section मिलेगा
  ↓

  👉 Public IP: ENABLE करो (check box)
     (तुम्हारा server remote से connect करेगा)
  
  👉 Private IP: Leave it (अभी जरूरत नहीं)
```

### Step 2.6: Backup & Network Settings

```
नीचे और scroll करो:
  ↓
  Backups:
    → "Automated backups": ON (पहले से होगा)
    → "Binary log": ON (recommended)
    → Backup location: Automatic
  
  Flag Settings (optional):
    → cloudsql_iam_authentication: OFF
```

---

## Phase 3: CREATE बटन दबाओ! (10 minutes wait)

```
नीचे दाएं हाथ देखो:
  ↓
  CREATE INSTANCE (नीला बटन)
  ↓
  Click करो!
  ↓
  ⏳ Instance create होने में 5-10 मिनट लगेंगे
  ↓
  Console पर green checkmark आ जाएगा जब complete हो
```

---

## Phase 4: Database बनाओ (1 minute)

Instance create हो गया? अब:

```
Instance के dashboard पर:
  ↓
  "Databases" tab पर click करो (top में)
  ↓
  "+ Create database" button (नीला)
  ↓

Form में भरो:
  Database name: dairy_walla_db
  Character set: utf8mb4 (default)
  Collation: default
  
  ↓
  CREATE button पर click करो
```

---

## Phase 5: Connection Details प्राप्त करो (Important!)

Instance के main dashboard पर जाओ:

```
"Connections" tab खोलो:
  ↓
  यहाँ तुम्हें दिखेगा:
  
  ┌──────────────────────────────────────┐
  │ Public IP address: 34.XXX.XXX.XXX   │ ← COPY यह
  │ Instance type: Cloud SQL            │
  │ Port: 5432                          │
  └──────────────────────────────────────┘
  
  Scroll करके नीचे देखो:
  
  ┌──────────────────────────────────────┐
  │ User: postgres                       │
  │ Password: [जो तुमने बनाया]           │
  │ Database: dairy_walla_db            │
  └──────────────────────────────────────┘
```

---

## Phase 6: Security Setup (MUST DO!)

### 6.1: IP Whitelist करो

```
"Connections" tab में:
  ↓
  "Authorized networks" section
  ↓
  "+ Add a network" button
  ↓

Fill करो:
  Name: dairy-server
  Network: YOUR_SERVER_IP/32
  
  Example: 203.0.113.45/32
  
  👉 अगर पता नहीं है तो:
     Google में search करो: "my ip"
     या command चलाओ: ipconfig getifaddr en0 (Mac)
  
  ↓
  SAVE button
```

### 6.2: SSL Enable करो

```
"SSL connections" section में:
  ↓
  "Require SSL connection" toggle
  ↓
  ON करो (blue होगा)
```

---

## Phase 7: Connection String बनाओ

अब तुम्हारे पास है:

```
Public IP: 34.XXX.XXX.XXX
User: postgres
Password: MyDairy@2024Prod123
Database: dairy_walla_db
Port: 5432
```

यह CONNECTION STRING बनाओ:

```
postgresql://postgres:MyDairy@2024Prod123@34.XXX.XXX.XXX:5432/dairy_walla_db
```

**Format:**
```
postgresql://[USER]:[PASSWORD]@[PUBLIC_IP]:[PORT]/[DATABASE]
```

---

## Phase 8: Application में Connection करो

### Step 8.1: .env File Update करो

Folder खोलो: `dairy-setu`

```
अगर .env file नहीं है तो:
  ↓
  .env.example को .env के रूप में copy करो
  ↓
  या सीधे नया .env file बना दो
```

.env file में यह लिखो:

```env
# Google Cloud SQL Connection
DATABASE_URL="postgresql://postgres:MyDairy@2024Prod123@34.XXX.XXX.XXX:5432/dairy_walla_db"

# Node environment
NODE_ENV="production"

# Optional - अगर Supabase का कुछ और use कर रहे हो तो:
# SUPABASE_URL="https://your-project.supabase.co"
# SUPABASE_ANON_KEY="your-key"
```

### Step 8.2: Prisma Sync करो

Terminal में:

```powershell
# dairy-setu folder में जाओ
cd "e:\Dairy Walla Kiro\dairy-setu"

# Prisma को database से connect करो
npx prisma db push

# अगर कोई error न आए तो ✅ सफल है!
```

### Step 8.3: Database Schema Check करो

```powershell
# Database में कौन से tables हैं यह देखो
npx prisma studio

# यह एक GUI खोलेगा जहाँ तुम सब कुछ देख सकते हो
```

---

## Phase 9: Complete Testing

```powershell
# Application को build करो
npm run build:api

# Server start करो
npm run start:api

# अगर कोई error न आए तो ✅✅✅ सब कुछ ठीक है!
```

---

## ✅ Verification Checklist

यह सब check करो कि सब हो गया:

- [ ] Cloud SQL API enabled
- [ ] PostgreSQL 15 instance created (dairy-db-prod)
- [ ] Machine type: db-f1-micro (free tier)
- [ ] Region: asia-south1 (Mumbai)
- [ ] Database created: dairy_walla_db
- [ ] Public IP obtained
- [ ] IP whitelist configured
- [ ] SSL enabled
- [ ] .env file में DATABASE_URL updated
- [ ] `npx prisma db push` successful
- [ ] Server start हुआ बिना error के

---

## 📝 सब Credentials एक जगह

जब database तैयार हो जाए तो यह note करो:

```
Instance Name: dairy-db-prod
Public IP: 34.XXX.XXX.XXX
Database: dairy_walla_db
User: postgres
Password: [तुम्हारा password]
Port: 5432

CONNECTION STRING:
postgresql://postgres:[password]@34.XXX.XXX.XXX:5432/dairy_walla_db
```

**यह safely रखो!** 1Password में store करो।

---

## 🚨 अगर Error आए

| Error | Solution |
|-------|----------|
| "Connection refused" | IP whitelist में अपना IP add करो |
| "database does not exist" | Cloud Console से verify करो कि database बना है |
| "password authentication failed" | Password को double-check करो |
| "timeout" | Network/firewall issue - IT team से contact करो |
| "too many connections" | Connection pooling setup करनी पड़ेगी |

---

## 💰 Final Cost Check

```
Your Setup:
├── Machine: db-f1-micro ✅ (free tier eligible)
├── Storage: 10 GB (auto-expandable)
├── Region: asia-south1 ✅ (cheapest in India)
├── Backup: Automatic (free)
└── Monthly cost: ~₹1,000

Your Credits: ₹945.51
Expected duration: ~10 months free ✅
```

---

## 🎯 अगले Steps (Database के बाद)

1. ✅ Supabase से backup लो (अगर पहले data है)
2. ✅ Data migrate करो (migration script use करो)
3. ✅ Testing करो locally
4. ✅ Production में deploy करो
5. ✅ Monitoring setup करो (Google Cloud Monitoring)

---

## 📞 Need Help?

सब steps follow करने के बाद:
- Google Cloud Console में **Support** click करो
- या यहाँ message भेज दो

**Good luck! 🚀**
