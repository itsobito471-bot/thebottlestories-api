const express = require('express');
const router = express.Router();
const authController = require('../controllers/adminAuthController');

// @route   POST api/auth/login
// @desc    Authenticate admin & get token
// @access  Public
router.post('/admin-login', authController.login);

module.exports = router;