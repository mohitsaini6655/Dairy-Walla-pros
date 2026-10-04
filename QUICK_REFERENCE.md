# 🎯 Quick Reference Card - Database Creation

## मिनट-दर-मिनट Timeline

```
0-5 min:   Cloud SQL API enable करो
5-15 min:  Instance create करो (5-10 min wait)
15-20 min: Database बनाओ
20-25 min: Security setup करो
25-30 min: Connection string बनाओ
30-35 min: .env में डालो
35-40 min: Testing करो
```

---

## Required Information

```
📝 तुम्हें चाहिए:
  ✓ Google Account
  ✓ Active Billing Account (तुम्हारे पास है ₹945.51 का)
  ✓ Strong password (बनानी होगी)
  ✓ Server IP address (पता करना होगा)
```

---

## Configuration Values (Copy-Paste करो)

```
Instance ID:          dairy-db-prod
Password:            [तुम यह बनाओ]
Database Version:    PostgreSQL 15
Region:              asia-south1 (Mumbai)
Zonal Availability:  Single zone
Machine Type:        db-f1-micro
Storage Type:        SSD
Storage Capacity:    10 GB
Backup:              Automatic (ON)
Public IP:           (Auto-generated होगा)
Port:                5432
User:                postgres
Database Name:       dairy_walla_db
```

---

## Step-by-Step Checklist

### Phase 1: Setup
- [ ] Google Cloud Console खोला
- [ ] Dairy Walla project select किया
- [ ] Cloud SQL API enable किया

### Phase 2: Instance
- [ ] "Create Instance" clicked
- [ ] PostgreSQL 15 selected
- [ ] All form fields filled:
  - [ ] Instance ID: dairy-db-prod
  - [ ] Password: ______________ (तुम्हारा)
  - [ ] Region: asia-south1
  - [ ] Machine: db-f1-micro
- [ ] CREATE INSTANCE clicked
- [ ] ⏳ 5-10 min wait किया
- [ ] Green checkmark मिल गया

### Phase 3: Database
- [ ] "Databases" tab खोला
- [ ] "+ Create database" clicked
- [ ] Database name: dairy_walla_db
- [ ] CREATE clicked

### Phase 4: Connections
- [ ] "Connections" tab खोला
- [ ] Public IP copied: _______________
- [ ] IP Whitelist configured
- [ ] SSL enabled

### Phase 5: Application
- [ ] .env file बनाया/updated किया
- [ ] CONNECTION_STRING added:
  ```
  postgresql://postgres:[password]@[IP]:5432/dairy_walla_db
  ```
- [ ] `npx prisma db push` successful
- [ ] Server started successfully

---

## Critical Information

```
⚠️  PASSWORD को save करो:
    ____________________
    
✓  PUBLIC IP को save करो:
    ____________________
    
✓  DATABASE NAME:
    dairy_walla_db
    
✓  USER:
    postgres
    
✓  PORT:
    5432
```

---

## Common Mistakes to Avoid

```
❌ Password को कहीं note न करो - console से copy करो
❌ IP whitelist बिना configure किए connection न करो
❌ db-f1-micro को change न करो (सबसे सस्ता है)
❌ asia-south1 region change न करो (fastest in India)
❌ SSL को disable न रखो

✅ Password को safely रखो (1Password)
✅ IP whitelist करो پہلے
✅ SSL को always ON रखो
✅ Backups को automatic रखो
✅ Regular monitoring करो
```

---

## Troubleshooting Quick Guide

```
🔴 "Connection refused"
    → IP whitelist में अपना IP add किया?
    → Firewall check किया?

🔴 "Database does not exist"
    → Console में verify किया कि database बना है?

🔴 "Password authentication failed"
    → Password correct है?
    → Special characters handle हुई हैं?

🔴 "Operation timed out"
    → Network connection check किया?
    → VPN/proxy issue तो नहीं?

🟡 "Slow queries"
    → Machine type सही है? (db-f1-micro ठीक है शुरुआत के लिए)
    → Indexes बने हैं?
```

---

## Post-Creation Tasks

```
Priority 1 (आज ही):
  [ ] Test connection locally
  [ ] Run: npm run build:api
  [ ] Run: npm run start:api

Priority 2 (अगले दिन):
  [ ] Backup लो पहला (manual)
  [ ] Monitoring setup करो
  [ ] Performance test करो

Priority 3 (धीरे-धीरे):
  [ ] Connection pooling setup करो
  [ ] Indexes optimize करो
  [ ] Supabase से complete migration करो
```

---

## Important URLs

```
🔗 Google Cloud Console:
   https://console.cloud.google.com

🔗 Cloud SQL Dashboard:
   https://console.cloud.google.com/sql

🔗 Billing:
   https://console.cloud.google.com/billing

🔗 Cloud SQL API:
   https://console.cloud.google.com/apis/library/sqladmin.googleapis.com
```

---

## Cost Summary

```
Monthly Cost:        ~₹1,000
Your Credits:        ₹945.51
Duration:            ~10 months free ✅

After 10 months:
  → Pay ₹1,000/month
  → Or scale down
  → Or optimize further
```

---

## Success Indicators

अगर यह सब दिख गया तो ✅ success है:

```
✅ Instance show होगा green status के साथ
✅ Database दिखेगा "Databases" tab में
✅ Connection string काम करेगा
✅ npm run start:api बिना error के चलेगा
✅ Data database में store होगा
```

---

## Phone-Friendly Format

**अगर mobile पर हो:**

```
1. console.cloud.google.com खोलो
2. Cloud SQL → Create Instance
3. PostgreSQL 15 → asia-south1 → dairy-db-prod
4. Password set करो
5. CREATE click करो (wait करो)
6. Database tab → dairy_walla_db create करो
7. IP whitelist करो
8. Connection string copy करो
9. .env में paste करो
10. npm run build:api करो

Done! ✅
```

---

**SAVE यह FILE अपने mobile में!** 📱
