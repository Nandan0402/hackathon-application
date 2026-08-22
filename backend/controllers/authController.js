const AuthService = require('../services/authService');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

class AuthController {
  /**
   * POST /api/auth/register
   * Registers a new user with Firebase Auth and persists role & profile in Firestore.
   */
  static async register(req, res, next) {
    try {
      const { email, password, name, role, phone, ...extra } = req.body;

      const result = await AuthService.register({
        email,
        password,
        name,
        role,
        phone,
        metadata: extra
      });

      return ApiResponse.success(
        res,
        'User registered successfully',
        result,
        201
      );
    } catch (error) {
      logger.error(`Registration error: ${error.message}`);
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Authenticates user against Firebase Auth and retrieves user profile with role.
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const result = await AuthService.login({ email, password });

      return ApiResponse.success(
        res,
        'User authenticated successfully',
        result,
        200
      );
    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      next(error);
    }
  }

  /**
   * POST /api/auth/google
   * Authenticates / syncs Google OAuth user and returns profile + token.
   */
  static async googleLogin(req, res, next) {
    try {
      const { idToken, role, email, name, photoURL, uid } = req.body;
      const result = await AuthService.googleAuth({ idToken, role, email, name, photoURL, uid });

      return ApiResponse.success(
        res,
        'Google authentication successful',
        result,
        200
      );
    } catch (error) {
      logger.error(`Google login error: ${error.message}`);
      next(error);
    }
  }

  /**
   * GET /api/auth/profile
   * Protected route to retrieve the authenticated user's profile and role.
   */
  static async getProfile(req, res, next) {
    try {
      const uid = req.user?.uid;
      const profile = await AuthService.getProfile(uid);

      return ApiResponse.success(
        res,
        'User profile retrieved successfully',
        {
          ...profile,
          tokenUid: uid
        },
        200
      );
    } catch (error) {
      logger.error(`Get profile error: ${error.message}`);
      next(error);
    }
  }
}

module.exports = AuthController;
