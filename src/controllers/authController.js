// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return sendError(res, 'Username and password are required.', [], 400);
    }

    const trimmedUsername = username.trim();

    // Query user by username or email
    const userResult = await query(
      'SELECT id, full_name, username, email, password_hash, role, is_active FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)',
      [trimmedUsername]
    );

    if (userResult.rowCount === 0) {
      return sendError(res, 'Invalid username or password.', [], 401);
    }

    const user = userResult.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return sendError(res, 'Account is deactivated. Please contact an administrator.', [], 403);
    }

    // Verify password with bcrypt
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return sendError(res, 'Invalid username or password.', [], 401);
    }

    // Generate JWT Token
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'investor_services_jwt_secret_super_key_2026_secure',
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    const userData = {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    };

    return sendSuccess(
      res,
      {
        token,
        user: userData,
      },
      'Logged in successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    return sendSuccess(res, { user: req.user }, 'Current user profile');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  getMe,
};
