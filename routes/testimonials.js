const express = require('express');
const router = express.Router();
const { getApprovedTestimonials, createTestimonial } = require('../controllers/testimonialController');
const upload = require('../middleware/upload');
// const upload = require('../middleware/upload'); // Your Multer config

// Public Routes
router.get('/approved', getApprovedTestimonials);

// Submit route (Add 'upload.single("image")' middleware if handling files)
router.post('/', upload.single('image'), createTestimonial);

module.exports = router;