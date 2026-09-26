// src/controllers/userController.js
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * Get all users with pagination
 * GET /api/users?limit=100&page=1
 */
const getUsers = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const offset = (page - 1) * limit;

    const [usersResult, countResult] = await Promise.all([
      query(
        `SELECT id, full_name, username, email, role, is_active, created_at, updated_at
         FROM users
         ORDER BY created_at ASC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      query('SELECT COUNT(*) FROM users'),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    return sendSuccess(
      res,
      {
        users: usersResult.rows,
        total,
        page,
        limit,
      },
      'Users retrieved successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new user
 * POST /api/users
 */
const createUser = async (req, res, next) => {
  try {
    const { full_name, username, email, password, role } = req.body;

    if (!full_name || !username || !email || !password) {
      return sendError(res, 'All fields (full_name, username, email, password) are required.', [], 400);
    }

    const assignedRole = role || 'employee';
    if (!['admin', 'employee', 'viewer'].includes(assignedRole)) {
      return sendError(res, 'Invalid role. Must be admin, employee, or viewer.', [], 400);
    }

    // Check duplicate username or email
    const duplicateCheck = await query(
      'SELECT id, username, email FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)',
      [username.trim(), email.trim()]
    );

    if (duplicateCheck.rowCount > 0) {
      const match = duplicateCheck.rows[0];
      if (match.username.toLowerCase() === username.trim().toLowerCase()) {
        return sendError(res, 'Username is already in use.', [], 409);
      }
      return sendError(res, 'Email address is already in use.', [], 409);
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = bcrypt.hashSync(password, saltRounds);

    const result = await query(
      `INSERT INTO users (full_name, username, email, password_hash, role, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6)
       RETURNING id, full_name, username, email, role, is_active, created_at, updated_at`,
      [full_name.trim(), username.trim(), email.trim().toLowerCase(), password_hash, assignedRole, req.user?.id || null]
    );

    const newUser = result.rows[0];

    return sendSuccess(
      res,
      {
        user: newUser,
      },
      'User created successfully',
      201
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a user
 * DELETE /api/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user && req.user.id === id) {
      return sendError(res, 'You cannot delete your own administrative account.', [], 400);
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id, username', [id]);

    if (result.rowCount === 0) {
      return sendError(res, 'User not found.', [], 404);
    }

    return sendSuccess(res, { id }, 'User deleted successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle user active status
 * PATCH /api/users/:id/toggle
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin from deactivating themselves
    if (req.user && req.user.id === id) {
      return sendError(res, 'You cannot deactivate your own administrative account.', [], 400);
    }

    const result = await query(
      `UPDATE users
       SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, full_name, username, email, role, is_active, updated_at`,
      [id]
    );

    if (result.rowCount === 0) {
      return sendError(res, 'User not found.', [], 404);
    }

    const updatedUser = result.rows[0];

    return sendSuccess(
      res,
      {
        user: updatedUser,
      },
      `User ${updatedUser.is_active ? 'activated' : 'deactivated'} successfully`
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  createUser,
  deleteUser,
  toggleUserStatus,
};
