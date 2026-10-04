# Google Cloud SQL - Cost Analysis for Dairy Walla

## आपके Credits: ₹945.51 (May 8, 2026 - May 8, 2027)

---

## Option 1: Micro Instance (शुरुआत के लिए अच्छा)
```
Instance Type: db-f1-micro
vCPU: 0.6 (shared)
Memory: 614 MB
Storage: 10 GB

Monthly Cost:
├── Compute: ₹800-900/month
├── Storage: ₹100-150/month
├── Backup: Free (1 week retention)
└── Total: ₹900-1050/month

Credits Duration: 10-11 months ✅ (आपके credits से पूरे साल चल जाएगा!)
```

---

## Option 2: Small Instance (Medium traffic के लिए)
```
Instance Type: db-n1-standard-1
vCPU: 1
Memory: 3.75 GB
Storage: 50 GB

Monthly Cost:
├── Compute: ₹2,500-3,000/month
├── Storage: ₹400-500/month
├── Backup: Free
└── Total: ₹2,900-3,500/month

Credits Duration: 3-4 months ⚠️
```

---

## Option 3: Mid-tier Instance (High traffic के लिए)
```
Instance Type: db-n1-standard-4
vCPU: 4
Memory: 15 GB
Storage: 100 GB

Monthly Cost: ₹8,000-10,000/month

Credits Duration: 1 month ❌
```

---

## 🎯 Recommendation: Micro Instance चुनें!

**क्यों?**
1. ✅ आपके credits पूरे साल चल जाएंगे
2. ✅ Dairy Walla के लिए काफी है (कम traffic)
3. ✅ Scalable है - बाद में upgrade कर सकते हैं
4. ✅ Free tier के साथ भी access मिलेगा

---

## Free Tier भी Check करें!

Google Cloud के free tier में शामिल:
- **Cloud SQL**: First 365 days में 250 GB/month data (first instance)
- **Cloud Storage**: 5 GB/month free
- Plus अन्य services

**Total Free Usage: ₹3,500-4,000/month की value!**

---

## Budget Alerts Setup करें

1. Google Cloud Console खोलें
2. **Billing** → **Budgets and alerts**
3. Budget set करें: ₹500/month (safety के लिए)
4. Alert threshold: 50%, 90%, 100%
5. Notifications email set करें

---

## Cost Optimization Tips

1. **Automatic backups**: पहले हफ्ते के backups ही रखें (पुरानों को delete करें)
2. **Unused instances**: अगर dev/staging हैं तो बंद करें
3. **Connection pooling**: PgBouncer setup करें (traffic optimize)
4. **Off-peak snapshots**: अगर लोड कम है तो smaller instance पर scale down करें

---

## Credits का Duration Calculate करें

```
Available Credits: ₹945.51
Estimated Monthly Cost: ₹1,000 (Micro instance)
Duration = ₹945.51 / ₹1,000 × 30 days
         ≈ 28 days free

फिर आपको regular billing के लिए payment method add करना होगा।
```

---

## Payment Method Setup

चूँकि credits खत्म हो जाएंगे, इसलिए:

1. **Credit Card** add करें
2. **Billing alerts** enable करें
3. **Budget limits** set करें
4. Monthly check करें कि खर्च कितना हो रहा है

---

## Migration के बाद Costs

| Item | Current (Supabase) | New (GCP) | Savings |
|------|-------------------|-----------|---------|
| Database | ~₹1,500 | ₹1,000 | ₹500/month |
| Bandwidth | Expensive | Cheaper | ✅ |
| Backup | Limited | Free | ✅ |
| Performance | Standard | Better | ✅ |

**Overall**: Google Cloud लगभग same price पर बेहतर service देगा!

---

## Important Notes

⚠️ Credits के बाद क्या होगा:
- May 8, 2027 के बाद credits खत्म हो जाएंगे
- Regular pricing apply होगी
- अगर payment method नहीं है तो service stop हो जाएगी

💡 Strategy:
1. अभी micro instance चलाएं (free/credits में)
2. May 2027 तक business grow करें
3. तब ही bigger instance पर migrate करें (जब revenue हो)
