// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  deleteUser,
  toggleUserStatus,
} = require('../controllers/userController');
const { verifyToken, checkRole } = require('../middlewares/auth');

// All user management routes require admin role
router.use(verifyToken, checkRole('admin'));

router.get('/', getUsers);
router.post('/', createUser);
router.delete('/:id', deleteUser);
router.patch('/:id/toggle', toggleUserStatus);

module.exports = router;
