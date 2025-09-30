# Home Task Organizer

A responsive web application for organizing household tasks with multi-device synchronization and real-time collaboration features.

## Features

- **Multi-device sync** via Firebase Firestore
- **Real-time collaboration** - changes sync across devices instantly
- **Offline-first** - works without internet, syncs when connected
- **Task management** with due dates, recurring cadence, and subtasks
- **Person assignment** with drag-and-drop reassignment
- **Calendar view** showing tasks by due date
- **Inline editing** for all task properties
- **Responsive design** for desktop, tablet, and mobile

## Quick Start

### Option 1: localStorage Only (Single Device)
1. Open `index.html` in your browser
2. Start organizing tasks immediately
3. Data persists in browser storage

### Option 2: Firebase Integration (Multi-device + Collaboration)
1. Follow the [Firebase Setup Guide](FIREBASE_SETUP.md)
2. Update `firebase-config.js` with your Firebase config
3. Deploy to Firebase Hosting for access anywhere

## Firebase Benefits

- **Cross-device access** - Use on phone, tablet, desktop
- **Family collaboration** - Multiple people can manage tasks
- **Real-time updates** - Changes appear instantly on all devices
- **Cloud backup** - Never lose your task data
- **Free tier** - Generous limits for personal/family use

## Technology Stack

- **Frontend**: Pure HTML, CSS, JavaScript (no frameworks)
- **Storage**: Firebase Firestore + localStorage fallback
- **Authentication**: Firebase Anonymous Auth
- **Hosting**: Firebase Hosting
- **Deployment**: GitHub Actions

## Development

1. Clone the repository
2. Open `index.html` in a web browser
3. For Firebase features, follow the setup guide
4. Make changes and test locally
5. Deploy via `firebase deploy` or push to trigger CI/CD

## Free Tier Usage

The app is optimized to stay within Firebase's generous free tier:
- Supports ~500 active users per day
- 10GB hosting storage + 360MB daily transfer
- Unlimited authentication
- Smart caching reduces database operations

See [Firebase Setup Guide](FIREBASE_SETUP.md) for detailed usage optimization strategies.