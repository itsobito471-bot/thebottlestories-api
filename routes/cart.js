const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const auth = require('../middleware/auth');

// All cart routes are protected
router.get('/', auth, cartController.getCart);
router.post('/', auth, cartController.updateCart);       // For saving state
router.post('/merge', auth, cartController.mergeCart);   // For login sync

module.exports = router;