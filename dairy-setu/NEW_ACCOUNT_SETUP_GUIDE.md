# 🚀 Dairy Walla - New Accounts & Setup Guide

Purane Firebase, Database, aur Render credentials ko project se completamente remove kar diya gaya hai. Ab aap apne naye accounts connect kar sakte hain.

---

## 🛠️ Step 1: Requirements Install & Setup Verify

Pehle terminal me dependencies install aur generate karein:

```bash
cd dairy-setu
npm install
npx prisma generate
```

---

## 🔥 Step 2: New Firebase Account Setup

1. [Firebase Console](https://console.firebase.google.com/) par jayein aur **Create Project** par click karein.
2. Naya project banayein (e.g. `Dairy-Walla-New`).
3. **Authentication** section me jaakar **Email/Password** sign-in method enable karein.
4. **Project Settings (⚙️ icon)** -> **General** me bottom par **Add App** (`</>` Web) click karein.
5. Jo `firebaseConfig` keys milenge, unhe apne `dairy-setu/.env` file me enter karein:

```env
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-app-id"
VITE_FIREBASE_STORAGE_BUCKET="your-app.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef..."
```

6. **Firebase Admin SDK (Backend token verification ke liye):**
   - Project Settings -> **Service accounts** tab par jayein.
   - **Generate new private key** par click karke JSON file download karein.
   - `.env` me un credentials ko fill karein:
     ```env
     FIREBASE_PROJECT_ID="your-app-id"
     FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your-app-id.iam.gserviceaccount.com"
     FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
     ```

---

## 🛢️ Step 3: New Database Setup (MongoDB / Supabase / PostgreSQL)

Prisma configuration par base karke aap MongoDB ya PostgreSQL connect kar sakte hain:

### Option A: MongoDB Atlas (Recommended for default schema)
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) par free cluster banayein.
2. Database User (Username & Password) create karein.
3. Network Access me IP Allow (0.0.0.0/0 for anywhere access) set karein.
4. Connection String copy karke `dairy-setu/.env` me paste karein:
   ```env
   DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/dairywalla?retryWrites=true&w=majority"
   ```

5. Database schema generate karein:
   ```bash
   npx prisma db push
   ```

---

## 🌐 Step 4: Render Deployment (New Account)

1. [Render.com](https://render.com/) par naya account banayein ya login karein.
2. **New +** -> **Web Service** choose karein.
3. Apne GitHub repository ko connect karein.
4. Following settings enter karein:
   - **Root Directory:** `dairy-setu`
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npm run start:api`
5. **Environment Variables** tab me ye keys add karein:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: *(Your MongoDB connection string)*
   - `FIREBASE_PROJECT_ID`: *(Your Firebase Project ID)*
   - `FIREBASE_CLIENT_EMAIL`: *(Your Firebase Client Email)*
   - `FIREBASE_PRIVATE_KEY`: *(Your Firebase Private Key)*
   - `ADMIN_PASSWORD`: *(Your Admin Password)*
   - `ADMIN_SESSION_SECRET`: *(Your Admin Session Secret)*

6. Render service deploy hone ke baad URL copy karein (e.g. `https://your-api.onrender.com`).
7. Apne frontend `.env.production` me update karein:
   ```env
   VITE_API_URL="https://your-api.onrender.com/api"
   ```

---

## 💻 Step 5: How to Run Locally

### 1. Backend Server run karne ke liye:
```bash
cd dairy-setu
npm run start:api
```

### 2. Frontend Development Server run karne ke liye:
```bash
cd dairy-setu
npm run dev
```

### 3. Desktop Application Launcher (Python):
```bash
python app.py
```
