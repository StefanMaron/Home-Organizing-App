# Firebase Setup Guide

## Firebase Free Tier Limits & Strategy

### Spark Plan (Free) Limits:
- **Firestore**: 50,000 reads, 20,000 writes, 20,000 deletes per day
- **Hosting**: 10 GB storage, 360 MB/day transfer
- **Authentication**: Unlimited users
- **Functions**: 125,000 invocations, 40,000 GB-seconds per month

### Optimization Strategy to Stay Within Free Tier:

1. **Firestore Usage Optimization**:
   - Store all user data in a single document per user
   - Use real-time listeners sparingly (only when app is active)
   - Batch writes when possible
   - Cache data locally to reduce reads

2. **Estimated Usage**:
   - Active user: ~100 reads + 50 writes per day
   - Can support ~500 active users per day within free tier
   - Hosting easily handles personal/family use

## Setup Steps

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name: "home-organizer" (or your choice)
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Services
1. **Authentication**:
   - Go to Authentication > Sign-in method
   - Enable "Anonymous" authentication
   
2. **Firestore Database**:
   - Go to Firestore Database
   - Click "Create database"
   - Start in "test mode" (we'll update rules)
   - Choose location (closest to users)

3. **Hosting**:
   - Go to Hosting
   - Click "Get started"
   - Follow the setup wizard

### 3. Configure Your Project
1. Go to Project Settings (gear icon)
2. Scroll to "Your apps" section
3. Click "Web app" (</>) icon
4. Name: "Home Organizer"
5. Check "Also set up Firebase Hosting"
6. Copy the config object

### 4. Update firebase-config.js
Replace the firebaseConfig object in `firebase-config.js` with your config:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789012",
    appId: "your-actual-app-id"
};
```

### 5. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 6. Set Up Continuous Deployment

#### Option A: Firebase CLI (Manual)
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init` (select Hosting and Firestore)
4. Deploy: `firebase deploy`

#### Option B: GitHub Actions (Automatic)
1. Get Firebase token: `firebase login:ci`
2. Copy the token
3. Go to GitHub repo Settings > Secrets and variables > Actions
4. Add new secret: `FIREBASE_TOKEN` with your token value
5. Push to main branch - automatic deployment will trigger

## Monitoring Usage

1. Go to Firebase Console > Usage and billing
2. Monitor Firestore reads/writes
3. Set up budget alerts in Google Cloud Console
4. Track hosting bandwidth usage

## Performance Tips

1. **Minimize Firestore Operations**:
   - Use auto-save timer (current: 30 seconds)
   - Debounce rapid changes
   - Cache data in localStorage as backup

2. **Optimize Bundle Size**:
   - Use Firebase v9 modular SDK for production
   - Remove unused Firebase services
   - Enable compression in hosting

3. **User Experience**:
   - Graceful fallback to localStorage if Firebase fails
   - Show connection status to users
   - Implement retry logic for failed operations

## Cost Monitoring Alert Setup

1. Go to Google Cloud Console
2. Select your Firebase project
3. Go to Billing > Budgets & alerts
4. Create budget: $1 (well above free tier)
5. Set alert at 50%, 90%, 100%
6. Add email notifications

This setup ensures you'll be notified if approaching any limits while staying within the generous free tier for personal/family use.