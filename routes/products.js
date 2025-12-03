// routes/products.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { 
  filterProducts, 
  getMostPreferredProducts ,
  getProductById,
  getAllProductIds,
  rateProduct,
  getUserRating
} = require('../controllers/productController');

// @route   GET /api/productsfilter
// @desc    Get products with advanced filtering, sorting, and pagination
// @access  Public
router.get('/filter', filterProducts);

// @route   GET /api/products/preferred
// @desc    Get top 10 most preferred (highest rated) products
// @access  Public
router.get('/preferred', getMostPreferredProducts);


// @access  Public
router.get('/all/ids', getAllProductIds); // <-- ADD THIS LINE


// @route   GET /api/products/:id
// @desc    Get a single product by its ID
// @access  Public
router.get('/:id', getProductById); // <-- 2. Add new route

// @route   POST /api/products/:id/rate
// @desc    Submit a rating
// @access  Private
router.post('/:id/rate', auth, rateProduct); 

// @route   GET /api/products/:id/user-rating
// @desc    Check if user rated
// @access  Private
router.get('/:id/user-rating', auth, getUserRating);

module.exports = router;