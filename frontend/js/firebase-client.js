/**
 * NexusAI - Firebase Web SDK Client Integration
 * Connects frontend directly to Firebase Authentication and the Backend API
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Firebase Configuration from Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyBFNem_u9azeS6H9bw8ickFAHl-HKzxGhc",
  authDomain: "testing-3787d.firebaseapp.com",
  projectId: "testing-3787d",
  storageBucket: "testing-3787d.firebasestorage.app",
  messagingSenderId: "917339535010",
  appId: "1:917339535010:web:bd4d3d9fb4c255439189fb",
  measurementId: "G-DSG6R0N18Y"
};

// Initialize Firebase App & Auth
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Export global helper for vanilla HTML/JS pages
window.NexusFirebase = {
  auth,
  
  /**
   * Sign In / Sign Up with Google Popup
   */
  async signInWithGoogle(selectedRole = 'worker') {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL || '',
          role: selectedRole.toUpperCase()
        },
        idToken
      };
    } catch (error) {
      console.error("Google Auth Error:", error);
      return {
        success: false,
        code: error.code,
        message: error.message
      };
    }
  },

  /**
   * Sign In with Email and Password
   */
  async signInWithEmail(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;
      const idToken = await user.getIdToken();

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.displayName || email.split('@')[0]
        },
        idToken
      };
    } catch (error) {
      console.error("Email Sign-In Error:", error);
      return {
        success: false,
        code: error.code,
        message: error.message
      };
    }
  },

  /**
   * Register with Email and Password
   */
  async registerWithEmail(email, password, name) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
      if (name) {
        await updateProfile(user, { displayName: name });
      }
      const idToken = await user.getIdToken();

      return {
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          name: name || user.displayName || email.split('@')[0]
        },
        idToken
      };
    } catch (error) {
      console.error("Email Registration Error:", error);
      return {
        success: false,
        code: error.code,
        message: error.message
      };
    }
  },

  /**
   * Sign Out
   */
  async logOut() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
};

console.log("[NexusFirebase] Firebase Authentication client initialized successfully.");
