const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');

// All routes are protected
router.use(authMiddleware);

// @route   GET api/analytics
// @desc    Get dashboard analytics (Sales, Products, etc)
router.get('/', analyticsController.getAnalytics);

module.exports = router;
