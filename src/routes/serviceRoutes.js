// src/routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} = require('../controllers/serviceController');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', getServices);
router.get('/:id', getServiceById);
router.post('/', checkRole('admin', 'employee'), createService);
router.put('/:id', checkRole('admin', 'employee'), updateService);
router.delete('/:id', checkRole('admin'), deleteService);

module.exports = router;
