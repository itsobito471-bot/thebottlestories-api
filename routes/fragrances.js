const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// @route   GET /api/fragrances
// @desc    Get all fragrances (publicly accessible)
// @access  Public
router.get('/', adminController.getFragrances); // Reusing existing controller function

// @route   GET /api/fragrances/:id
// @desc    Get single fragrance
// @access  Public
router.get('/:id', adminController.getFragranceById);

module.exports = router;
