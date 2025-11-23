// routes/products.js

const express = require('express');
const router = express.Router();
const { 
  filterProducts, 
  getMostPreferredProducts ,
  getProductById,
  getAllProductIds
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

module.exports = router;