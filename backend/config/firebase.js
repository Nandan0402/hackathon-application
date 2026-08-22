const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

let db = null;
let auth = null;
let isInitialized = false;
let authMode = 'none'; // 'admin' | 'rest' | 'none'

const getFirebaseApiKey = () => process.env.FIREBASE_API_KEY;
const getFirebaseProjectId = () => process.env.FIREBASE_PROJECT_ID;

/**
 * Initializes Firebase Admin SDK with Service Account or Project ID
 */
const initFirebase = () => {
  try {
    if (admin.apps.length > 0) {
      db = admin.firestore();
      auth = admin.auth();
      isInitialized = true;
      authMode = 'admin';
      return { db, auth, admin, isInitialized, authMode };
    }

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : null;

    if (serviceAccountPath && fs.existsSync(path.resolve(serviceAccountPath))) {
      const serviceAccount = require(path.resolve(serviceAccountPath));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
      db = admin.firestore();
      auth = admin.auth();
      isInitialized = true;
      authMode = 'admin';
      logger.info('Firebase Admin initialized via service account file');
      return { db, auth, admin, isInitialized, authMode };
    }

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        }),
        projectId
      });
      db = admin.firestore();
      auth = admin.auth();
      isInitialized = true;
      authMode = 'admin';
      logger.info('Firebase Admin initialized via environment credentials');
      return { db, auth, admin, isInitialized, authMode };
    }

    if (getFirebaseApiKey() && getFirebaseProjectId()) {
      isInitialized = true;
      authMode = 'rest';
      logger.info(`Firebase initialized in REST/API mode for project: ${getFirebaseProjectId()}`);
    } else {
      logger.warn('Firebase credentials not detected in .env');
    }
  } catch (error) {
    logger.error('Firebase initialization error', error);
  }

  return { db, auth, isInitialized, authMode };
};

// Initialize on module load
initFirebase();

/**
 * Firebase Auth REST API Helper (Identity Toolkit)
 */
const firebaseRestAuth = {
  async createUser(email, password, displayName) {
    const apiKey = getFirebaseApiKey();
    if (!apiKey) throw new Error('FIREBASE_API_KEY is not configured in .env');

    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        displayName,
        returnSecureToken: true
      })
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data.error?.message || 'Failed to create user with Firebase Auth';
      throw new Error(errorMsg);
    }

    return {
      uid: data.localId,
      email: data.email,
      displayName: data.displayName,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn
    };
  },

  async signInWithPassword(email, password) {
    const apiKey = getFirebaseApiKey();
    if (!apiKey) throw new Error('FIREBASE_API_KEY is not configured in .env');

    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    });

    const data = await res.json();
    if (!res.ok) {
      const rawMsg = data.error?.message || 'INVALID_LOGIN_CREDENTIALS';
      const errorMsg = rawMsg.includes('INVALID') || rawMsg.includes('NOT_FOUND')
        ? 'Invalid email or password. Please check your credentials or click Autofill for demo accounts.'
        : rawMsg;
      const authErr = new Error(errorMsg);
      authErr.statusCode = 401;
      throw authErr;
    }

    return {
      uid: data.localId,
      email: data.email,
      displayName: data.displayName,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn
    };
  },

  async verifyIdToken(idToken) {
    const apiKey = getFirebaseApiKey();
    if (!apiKey) throw new Error('FIREBASE_API_KEY is not configured in .env');

    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    const data = await res.json();
    if (!res.ok || !data.users || !data.users[0]) {
      const errorMsg = data.error?.message || 'Invalid or expired authentication token';
      throw new Error(errorMsg);
    }

    const user = data.users[0];
    return {
      uid: user.localId,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified
    };
  }
};

/**
 * Firestore REST API Helper (Fallback when Admin SDK service account key is not present)
 */
const firestoreRest = {
  toFirestoreFields(obj) {
    const fields = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        fields[key] = { nullValue: null };
      } else if (typeof value === 'boolean') {
        fields[key] = { booleanValue: value };
      } else if (typeof value === 'number') {
        fields[key] = Number.isInteger(value) ? { integerValue: value.toString() } : { doubleValue: value };
      } else if (typeof value === 'string') {
        fields[key] = { stringValue: value };
      } else if (Array.isArray(value)) {
        fields[key] = {
          arrayValue: {
            values: value.map((v) => ({ stringValue: String(v) }))
          }
        };
      } else if (typeof value === 'object') {
        fields[key] = { mapValue: { fields: this.toFirestoreFields(value) } };
      }
    }
    return fields;
  },

  fromFirestoreFields(fields) {
    if (!fields) return {};
    const obj = {};
    for (const [key, val] of Object.entries(fields)) {
      if ('stringValue' in val) obj[key] = val.stringValue;
      else if ('integerValue' in val) obj[key] = parseInt(val.integerValue, 10);
      else if ('doubleValue' in val) obj[key] = parseFloat(val.doubleValue);
      else if ('booleanValue' in val) obj[key] = val.booleanValue;
      else if ('nullValue' in val) obj[key] = null;
      else if ('mapValue' in val) obj[key] = this.fromFirestoreFields(val.mapValue.fields);
      else if ('arrayValue' in val) obj[key] = (val.arrayValue.values || []).map((v) => Object.values(v)[0]);
    }
    return obj;
  },

  async getDocument(collection, docId) {
    const projectId = getFirebaseProjectId();
    const apiKey = getFirebaseApiKey();
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}?key=${apiKey}`;

    const res = await fetch(url);
    if (res.status === 404) return null;
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to fetch document from Firestore');
    }
    return this.fromFirestoreFields(data.fields);
  },

  async setDocument(collection, docId, dataObj) {
    const projectId = getFirebaseProjectId();
    const apiKey = getFirebaseApiKey();
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}?key=${apiKey}`;

    const fields = this.toFirestoreFields(dataObj);
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to write document to Firestore');
    }
    return this.fromFirestoreFields(data.fields);
  }
};

/**
 * Unified Unified Firebase Operations:
 * Seamlessly uses Firebase Admin SDK if service account is configured,
 * or Firebase REST APIs when using client API Key.
 */
const localMemoryStore = new Map();

const firestoreDb = {
  async getDoc(collection, docId) {
    if (db && authMode === 'admin') {
      try {
        const snap = await db.collection(collection).doc(docId).get();
        if (snap.exists) return snap.data();
      } catch (err) {
        logger.warn(`Admin Firestore getDoc error, falling back: ${err.message}`);
      }
    }
    try {
      const restDoc = await firestoreRest.getDocument(collection, docId);
      if (restDoc) return restDoc;
    } catch (err) {
      logger.warn(`REST Firestore getDoc error, checking memory cache: ${err.message}`);
    }
    const memKey = `${collection}/${docId}`;
    return localMemoryStore.get(memKey) || null;
  },

  async setDoc(collection, docId, data) {
    const memKey = `${collection}/${docId}`;
    localMemoryStore.set(memKey, data);

    if (db && authMode === 'admin') {
      try {
        await db.collection(collection).doc(docId).set(data, { merge: true });
        return data;
      } catch (err) {
        logger.warn(`Admin Firestore setDoc error, saved to memory: ${err.message}`);
      }
    }
    try {
      await firestoreRest.setDocument(collection, docId, data);
    } catch (err) {
      logger.warn(`REST Firestore setDoc error, saved to memory: ${err.message}`);
    }
    return data;
  },

  async getAllDocs(collection) {
    if (db && authMode === 'admin') {
      try {
        const snapshot = await db.collection(collection).get();
        const results = [];
        snapshot.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
        if (results.length > 0) return results;
      } catch (err) {
        logger.warn(`Admin Firestore getAllDocs error: ${err.message}`);
      }
    }
    try {
      const restDocs = await firestoreRest.getAllDocuments ? await firestoreRest.getAllDocuments(collection) : [];
      if (restDocs && restDocs.length > 0) return restDocs;
    } catch (err) {
      logger.warn(`REST Firestore getAllDocs error: ${err.message}`);
    }

    const prefix = `${collection}/`;
    const results = [];
    for (const [key, value] of localMemoryStore.entries()) {
      if (key.startsWith(prefix)) {
        results.push(value);
      }
    }
    return results;
  },

  async deleteDoc(collection, docId) {
    const memKey = `${collection}/${docId}`;
    localMemoryStore.delete(memKey);

    if (db && authMode === 'admin') {
      try {
        await db.collection(collection).doc(docId).delete();
        return true;
      } catch (err) {
        logger.warn(`Admin Firestore deleteDoc error: ${err.message}`);
      }
    }
    try {
      const projectId = getFirebaseProjectId();
      const apiKey = getFirebaseApiKey();
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}?key=${apiKey}`;
      await fetch(url, { method: 'DELETE' });
    } catch (err) {
      logger.warn(`REST Firestore deleteDoc error: ${err.message}`);
    }
    return true;
  }
};

const authServiceWrapper = {
  async createUser(email, password, displayName) {
    if (auth && authMode === 'admin') {
      try {
        const userRecord = await auth.createUser({
          email,
          password,
          displayName
        });
        // Generate custom token or sign in via REST to get ID token
        const signInResult = await firebaseRestAuth.signInWithPassword(email, password);
        return {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          idToken: signInResult.idToken,
          refreshToken: signInResult.refreshToken,
          expiresIn: signInResult.expiresIn
        };
      } catch (err) {
        if (err.code && err.code.startsWith('auth/')) {
          throw err;
        }
        logger.warn(`Admin createUser error, using REST auth: ${err.message}`);
      }
    }
    return firebaseRestAuth.createUser(email, password, displayName);
  },

  async signInWithPassword(email, password) {
    return firebaseRestAuth.signInWithPassword(email, password);
  },

  async verifyIdToken(idToken) {
    if (auth && authMode === 'admin') {
      try {
        const decoded = await auth.verifyIdToken(idToken);
        return {
          uid: decoded.uid,
          email: decoded.email,
          displayName: decoded.name || decoded.displayName || '',
          emailVerified: decoded.email_verified
        };
      } catch (err) {
        // Fallback to REST token verification if Admin cert fails
        logger.warn(`Admin token verification fallback: ${err.message}`);
      }
    }
    return firebaseRestAuth.verifyIdToken(idToken);
  }
};

module.exports = {
  admin,
  getDb: () => db,
  getAuth: () => auth,
  isFirebaseConfigured: () => isInitialized,
  getAuthMode: () => authMode,
  reinitFirebase: initFirebase,
  firestoreDb,
  authServiceWrapper,
  firebaseRestAuth,
  firestoreRest
};
