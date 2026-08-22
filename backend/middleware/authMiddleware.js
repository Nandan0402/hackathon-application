const { authServiceWrapper, firestoreDb } = require('../config/firebase');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Middleware to verify Firebase ID Token from Authorization header
 */
const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.error(res, 'Authentication required. Missing or malformed Bearer token.', 401);
    }

    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      return ApiResponse.error(res, 'Authentication token is empty.', 401);
    }

    // 1. Verify token with Firebase Auth
    let decodedToken;
    try {
      decodedToken = await authServiceWrapper.verifyIdToken(token);
    } catch (authError) {
      logger.warn(`Token verification failed: ${authError.message}`);
      return ApiResponse.error(res, `Invalid or expired token: ${authError.message}`, 401);
    }

    // 2. Fetch user profile and role from Firestore
    let userProfile = null;
    try {
      userProfile = await firestoreDb.getDoc('users', decodedToken.uid);
    } catch (dbError) {
      logger.error(`Failed to fetch user profile from Firestore: ${dbError.message}`);
    }

    // Attach user to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: userProfile?.name || decodedToken.displayName || '',
      role: userProfile?.role || 'WORKER',
      profile: userProfile || null,
      token
    };

    next();
  } catch (error) {
    logger.error('Unexpected error in auth middleware', error);
    return ApiResponse.error(res, 'Internal authentication error', 500);
  }
};

/**
 * Middleware to enforce role-based access control
 * @param  {...string} allowedRoles (e.g., 'ADMIN', 'EMPLOYER', 'WORKER')
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Unauthorized. Please authenticate first.', 401);
    }

    const userRole = (req.user.role || '').toUpperCase();
    const upperAllowed = allowedRoles.map((r) => r.toUpperCase());

    if (!upperAllowed.includes(userRole)) {
      return ApiResponse.error(
        res,
        `Access denied. Required role: [${allowedRoles.join(', ')}]. Your role: ${userRole || 'NONE'}`,
        403
      );
    }

    next();
  };
};

/**
 * Convenience middleware for Admin-only routes
 */
const requireAdmin = requireRole('ADMIN');

/**
 * Convenience middleware for Employer or Admin routes
 */
const requireEmployer = requireRole('EMPLOYER', 'ADMIN');

/**
 * Convenience middleware for Worker routes
 */
const requireWorker = requireRole('WORKER', 'ADMIN');

module.exports = {
  verifyAuth,
  requireRole,
  requireAdmin,
  requireEmployer,
  requireWorker
};
