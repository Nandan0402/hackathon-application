const { authServiceWrapper, firestoreDb } = require('../config/firebase');
const logger = require('../utils/logger');

const VALID_ROLES = ['WORKER', 'EMPLOYER'];
const ALL_ROLES = ['WORKER', 'EMPLOYER', 'ADMIN'];

class AuthService {
  /**
   * Register a new user with Firebase Auth & Firestore
   */
  static async register({ email, password, name, role = 'WORKER', phone, metadata = {} }) {
    if (!email || !password || !name) {
      const error = new Error('Email, password, and name are required');
      error.statusCode = 400;
      throw error;
    }

    if (password.length < 6) {
      const error = new Error('Password must be at least 6 characters long');
      error.statusCode = 400;
      throw error;
    }

    // Role validation: Prevent public registration of ADMIN role
    const normalizedRole = role.toUpperCase();
    if (normalizedRole === 'ADMIN') {
      const error = new Error('Registration as ADMIN is not permitted through public registration');
      error.statusCode = 403;
      throw error;
    }

    if (!VALID_ROLES.includes(normalizedRole)) {
      const error = new Error(`Invalid role. Allowed roles are: ${VALID_ROLES.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    // 1. Create user in Firebase Authentication
    logger.info(`Creating Firebase Auth user for email: ${email}`);
    const authUser = await authServiceWrapper.createUser(email, password, name);

    const now = new Date().toISOString();
    const userProfile = {
      uid: authUser.uid,
      email: authUser.email,
      name,
      role: normalizedRole,
      phone: phone || '',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      ...metadata
    };

    // 2. Store user profile in Firestore
    logger.info(`Storing user profile in Firestore for UID: ${authUser.uid}`);
    await firestoreDb.setDoc('users', authUser.uid, userProfile);

    return {
      token: authUser.idToken,
      refreshToken: authUser.refreshToken,
      expiresIn: authUser.expiresIn,
      user: userProfile
    };
  }

  /**
   * Login user using Firebase Authentication and fetch Firestore profile
   */
  static async login({ email, password }) {
    if (!email || !password) {
      const error = new Error('Email and password are required');
      error.statusCode = 400;
      throw error;
    }

    // 1. Authenticate with Firebase Auth
    logger.info(`Authenticating user with Firebase Auth: ${email}`);
    const authResult = await authServiceWrapper.signInWithPassword(email, password);

    // 2. Fetch user profile from Firestore
    let userProfile = await firestoreDb.getDoc('users', authResult.uid);

    // If profile document does not exist yet, create a default profile
    if (!userProfile) {
      logger.warn(`Firestore profile missing for UID: ${authResult.uid}. Creating default profile.`);
      const now = new Date().toISOString();
      userProfile = {
        uid: authResult.uid,
        email: authResult.email,
        name: authResult.displayName || email.split('@')[0],
        role: 'WORKER',
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
      await firestoreDb.setDoc('users', authResult.uid, userProfile);
    }

    return {
      token: authResult.idToken,
      refreshToken: authResult.refreshToken,
      expiresIn: authResult.expiresIn,
      user: userProfile
    };
  }

  /**
   * Get user profile by UID from Firestore
   */
  static async getProfile(uid) {
    if (!uid) {
      const error = new Error('User UID is required');
      error.statusCode = 400;
      throw error;
    }

    const profile = await firestoreDb.getDoc('users', uid);
    if (!profile) {
      const error = new Error('User profile not found');
      error.statusCode = 404;
      throw error;
    }

    return profile;
  }
}

module.exports = AuthService;
