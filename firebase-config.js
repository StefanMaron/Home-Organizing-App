// Firebase configuration - replace with your project config
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Firebase services wrapper class
class FirebaseService {
    constructor() {
        this.db = null;
        this.auth = null;
        this.user = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            // Initialize Firebase
            firebase.initializeApp(firebaseConfig);
            this.db = firebase.firestore();
            this.auth = firebase.auth();
            
            // Set up auth state listener
            this.auth.onAuthStateChanged((user) => {
                this.user = user;
                if (user) {
                    console.log('User authenticated:', user.uid);
                    // Trigger data reload when user changes
                    if (window.app) {
                        window.app.onUserAuthenticated();
                    }
                } else {
                    console.log('User signed out');
                }
            });
            
            this.isInitialized = true;
            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Firebase initialization error:', error);
            throw error;
        }
    }

    async signInAnonymously() {
        if (!this.isInitialized) await this.init();
        
        try {
            const result = await this.auth.signInAnonymously();
            console.log('Anonymous authentication successful');
            return result.user;
        } catch (error) {
            console.error('Anonymous authentication failed:', error);
            throw error;
        }
    }

    async savePeople(people) {
        if (!this.user) {
            console.warn('No authenticated user, falling back to localStorage');
            return;
        }

        try {
            await this.db.collection('users').doc(this.user.uid).set({
                people: people,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log('People data saved to Firebase');
        } catch (error) {
            console.error('Error saving people to Firebase:', error);
            throw error;
        }
    }

    async saveTasks(tasks) {
        if (!this.user) {
            console.warn('No authenticated user, falling back to localStorage');
            return;
        }

        try {
            await this.db.collection('users').doc(this.user.uid).set({
                tasks: tasks,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log('Tasks data saved to Firebase');
        } catch (error) {
            console.error('Error saving tasks to Firebase:', error);
            throw error;
        }
    }

    async loadUserData() {
        if (!this.user) {
            console.warn('No authenticated user, using localStorage');
            return null;
        }

        try {
            const doc = await this.db.collection('users').doc(this.user.uid).get();
            
            if (doc.exists) {
                const data = doc.data();
                console.log('User data loaded from Firebase');
                return {
                    people: data.people || [],
                    tasks: data.tasks || [],
                    lastUpdated: data.lastUpdated
                };
            } else {
                console.log('No Firebase data found for user');
                return null;
            }
        } catch (error) {
            console.error('Error loading data from Firebase:', error);
            throw error;
        }
    }

    // Real-time listener for collaborative features
    onUserDataChange(callback) {
        if (!this.user) return null;

        return this.db.collection('users').doc(this.user.uid)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    callback({
                        people: data.people || [],
                        tasks: data.tasks || [],
                        lastUpdated: data.lastUpdated
                    });
                }
            }, (error) => {
                console.error('Real-time listener error:', error);
            });
    }
}

// Export for use in main app
window.firebaseService = new FirebaseService();