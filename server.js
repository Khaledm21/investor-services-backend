// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { testConnection } = require('./src/config/db');
const { errorHandler, notFoundHandler } = require('./src/middlewares/errorHandler');
const { sendSuccess } = require('./src/utils/responseHandler');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const clientRoutes = require('./src/routes/clientRoutes');
const serviceRoutes = require('./src/routes/serviceRoutes');
const operationRoutes = require('./src/routes/operationRoutes');

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Allowed origins for CORS (React frontend)
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

// CORS Middleware Configuration - Allow all origins in local dev (e.g. 5173, 5174, 5176, etc.)
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.options('*', cors());


// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    name: 'Investor Services Center Management System API',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  return sendSuccess(res, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  }, 'Investor Services API is running.');
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/operations', operationRoutes);

// 404 Route Not Found
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

// Start Server and Test Database Connection
const startServer = async () => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
      console.log(`🌐 Health check available at http://localhost:${PORT}/api/health`);
      console.log(`🔒 Allowed CORS origins: ${allowedOrigins.join(', ')}`);
      console.log('====================================================');
    });
  } catch (err) {
    console.error('Fatal error starting server:', err.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
