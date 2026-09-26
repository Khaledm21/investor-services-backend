// src/routes/clientRoutes.js
const express = require('express');
const router = express.Router();
const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
} = require('../controllers/clientController');
const { verifyToken, checkRole } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', getClients);
router.get('/:id', getClientById);
router.post('/', checkRole('admin', 'employee'), createClient);
router.put('/:id', checkRole('admin', 'employee'), updateClient);
router.delete('/:id', checkRole('admin'), deleteClient);

module.exports = router;
