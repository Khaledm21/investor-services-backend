// src/middlewares/auth.js
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { sendError } = require('../utils/responseHandler');

/**
 * Middleware to verify JWT token and inject active user into req.user
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication required. No token provided.', [], 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return sendError(res, 'Authentication token is missing.', [], 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'investor_services_jwt_secret_super_key_2026_secure');

    // Fetch user from DB to ensure account is active and exists
    const result = await query(
      'SELECT id, full_name, username, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rowCount === 0) {
      return sendError(res, 'User account no longer exists.', [], 401);
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return sendError(res, 'User account is deactivated. Please contact administrator.', [], 403);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Token has expired. Please log in again.', [], 401);
    }
    if (err.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid authentication token.', [], 401);
    }
    return sendError(res, 'Authentication failed.', [err.message], 401);
  }
};

/**
 * Role Guard Middleware
 * @param  {...string} roles Allowed roles (e.g. 'admin', 'employee')
 */
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized. Please login first.', [], 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        'Forbidden. You do not have permission to access this resource.',
        [],
        403
      );
    }

    next();
  };
};

module.exports = {
  verifyToken,
  checkRole,
};
