const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

// POST /api/orders
router.post('/', auth, orderController.createOrder);

module.exports = router;