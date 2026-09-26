// src/utils/responseHandler.js

/**
 * Standard Success Response
 * format: { success: true, data: { ... }, message: "..." }
 */
const sendSuccess = (res, data = {}, message = 'Operation successful', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Standard Error Response
 * format: { success: false, message: "...", errors: [] }
 */
const sendError = (res, message = 'An error occurred', errors = [], statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors],
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
