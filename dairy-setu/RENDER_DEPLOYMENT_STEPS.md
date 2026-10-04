# 🚀 Render Deployment & MongoDB Environment Guide

Aapka backend API server (`dairy-setu/server.ts`) aur MongoDB Prisma schema (`schema.prisma`) **100% ready aur valid** hain.

---

## 🛠️ Step 1: Render.com Par Web Service Banayein

1. [Render Dashboard](https://dashboard.render.com/) par login karein.
2. Top right par **New +** -> **Web Service** par click karein.
3. Apne GitHub repository ko select karke connect karein.
4. Following fields enter karein:
   * **Name:** `dairy-walla-api`
   * **Root Directory:** `dairy-setu`
   * **Environment / Runtime:** `Node`
   * **Build Command:** `npm install && npx prisma generate`
   * **Start Command:** `npm run start:api`

---

## 🔑 Step 2: Render me Environment Variables Add Karein

Render Dashboard me **Environment** tab par jaakar ye key-value pairs enter karein:

| Key | Value / Instructions |
| :--- | :--- |
| **`NODE_ENV`** | `production` |
| **`DATABASE_URL`** | *(Apna MongoDB connection string paste karein)* <br>`mongodb+srv://username:password@cluster.mongodb.net/dairywalla?retryWrites=true&w=majority` |
| **`FIREBASE_PROJECT_ID`** | `dairy-walla-cc77f` |
| **`FIREBASE_CLIENT_EMAIL`** | *(Firebase Console > Service Accounts se client email)* |
| **`FIREBASE_PRIVATE_KEY`** | *(Firebase Console > Service Accounts se private key)* |
| **`ADMIN_PASSWORD`** | `YourSecureAdminPassword123` |
| **`ADMIN_SESSION_SECRET`** | `YourSessionSecretKey123` |

---

## 🔗 Step 3: Render API URL Ko Frontend Me Connect Karein

Deploy hone ke baad Render aapko 1 URL dega (e.g. `https://dairy-walla-api.onrender.com`).

Us URL ko apne `dairy-setu/.env.production` me update karein:
```env
VITE_API_URL="https://dairy-walla-api.onrender.com/api"
```

Aur frontend rebuild kar ke Firebase Hosting par redeploy kar dein:
```cmd
cmd /c "cd dairy-setu && npm run build && npx firebase deploy --only hosting"
```

---

## 🔍 Database Save & Connectivity Check Summary:
* ✅ **Prisma Schema:** `schema.prisma` is 100% valid with MongoDB provider (`The schema at schema.prisma is valid 🚀`).
* ✅ **Data Models:** Profiles, Products, Orders, Connections, aur Invoices sab MongoDB ObjectIDs (`_id`) ke saath mapped hain.
* ✅ **Automatic Sync:** Server start hote hi Prisma MongoDB Atlas me data read/write handle karta hai.
