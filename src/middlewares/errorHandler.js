// src/middlewares/errorHandler.js
const { sendError } = require('../utils/responseHandler');

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('💥 [Server Error]:', err);

  // SyntaxError from body-parser (invalid JSON body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 'Invalid JSON payload received in request body.', [err.message], 400);
  }

  // PostgreSQL Unique Key Constraint Violation
  if (err.code === '23505') {
    const detail = err.detail || 'A record with this unique value already exists.';
    return sendError(res, detail, [err.detail], 409);
  }

  // PostgreSQL Foreign Key Constraint Violation
  if (err.code === '23503') {
    const detail = err.detail || 'Foreign key constraint violated.';
    return sendError(res, detail, [err.detail], 400);
  }

  // PostgreSQL Invalid UUID format
  if (err.code === '22P02') {
    return sendError(res, 'Invalid UUID or parameter format provided.', [err.message], 400);
  }

  // Express-validator or validation custom errors
  if (err.status && err.message) {
    return sendError(res, err.message, err.errors || [], err.status);
  }

  // Default fallback for unhandled internal server errors
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error occurred.'
    : err.message || 'Internal server error.';

  return sendError(res, message, [], 500);
};

/**
 * 404 Route Not Found Middleware
 */
const notFoundHandler = (req, res) => {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, [], 404);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
