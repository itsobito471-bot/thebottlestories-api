const express = require('express');
const router = express.Router();
const { getAllTags } = require('../controllers/tagController');

// @route   GET /api/tags
// @desc    Get all tags
// @access  Public
router.get('/', getAllTags);

module.exports = router;