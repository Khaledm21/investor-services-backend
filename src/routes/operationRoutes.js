// src/routes/operationRoutes.js
const express = require('express');
const router = express.Router();
const {
  getOperations,
  getOperationById,
  createOperation,
  updateOperation,
  updateOperationStatus,
  deleteOperation,
} = require('../controllers/operationController');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', getOperations);
router.get('/:id', getOperationById);
router.post('/', checkRole('admin', 'employee'), createOperation);
router.put('/:id', checkRole('admin', 'employee'), updateOperation);
router.patch('/:id/status', checkRole('admin', 'employee'), updateOperationStatus);
router.delete('/:id', checkRole('admin'), deleteOperation);

module.exports = router;
