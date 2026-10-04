# 🚀 DairyWalla System - Commands Reference Guide

This file contains all the essential commands required to develop, build, run, and deploy the different parts of the **DairyWalla** ecosystem.

---

## 📱 1. Mobile App (`mobile-app`)
Location: `e:\Dairy Walla APP\mobile-app`

### 💻 Local Development
Start the local development server (Expo Packager):
```powershell
npm start
```
*Press `a` to run on an Android emulator or device, or scan the QR code using the Expo Go app.*

### 🛠️ Android Builds (EAS)
Build a direct installable testing APK (configured to output `.apk` directly):
```powershell
eas build --platform android --profile preview
```

Build a Development Client build (for custom native plugins, e.g. notifications testing):
```powershell
eas build --platform android --profile development
```

Build a Production AAB build (for Google Play Store):
```powershell
eas build --platform android --profile production
```

### 🔑 Credentials Setup
Configure EAS / Android Google credentials or Push credentials (FCM Server Key):
```powershell
eas credentials
```

---

## 🛬 2. App Landing & Download Site (`Dairy Walla APP`)
Location: `e:\Dairy Walla APP`

This page (`https://cobalt-list-472201-v5.web.app`) hosts your APK file inside `firebase-public/downloads/dairy-walla-app.apk` and provides a beautiful download button.

### 🚀 Deploy / Push to Firebase
Whenever you update your APK in `firebase-public/downloads/` or modify `index.html`, run this command to push updates live:
```powershell
npx -p firebase-tools firebase deploy --only hosting
```

---

## 💻 3. Website & API Backend (`dairy-setu`)
Location: `e:\Dairy Walla\dairy-setu`

This contains the React + Vite frontend and the Express + Prisma API backend server.

### 🏃‍♂️ Running Locally
Run the Backend Express API Server:
```powershell
npm run start:api
```

Run the Frontend Web App:
```powershell
npm run dev
```

### 🗄️ Database Management (Prisma)
Generate the Prisma Client after any database schema changes:
```powershell
npx prisma generate
```

Push database schema updates to your MongoDB Atlas database:
```powershell
npx prisma db push
```

Open the visual Prisma Studio to view/edit MongoDB Atlas database records in browser:
```powershell
npx prisma studio
```

### 🚀 Deploy Website to Firebase Hosting
Deploy the main website (`https://dairywalla-website.web.app`) to Firebase:

1. **Build the production files (generates `dist` folder):**
   ```powershell
   npm run build
   ```
2. **Deploy/Push to Firebase Hosting:**
   ```powershell
   npx -p firebase-tools firebase deploy --only hosting
   ```
