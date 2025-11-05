const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');
// All routes in this file are protected by the authMiddleware
router.use(authMiddleware);

// @route   GET api/admin/stats
// @desc    Get dashboard stats
// @access  Private
router.get('/stats', adminController.getStats);

// @route   GET api/admin/orders
// @desc    Get all orders
// @access  Private
router.get('/orders', adminController.getOrders);

// @route   PATCH api/admin/orders/:orderId
// @desc    Update an order's status
// @access  Private
router.patch('/orders/:orderId', adminController.updateOrderStatus);

// @route   POST api/admin/upload
// @desc    Upload a product image
// @access  Private
router.post('/upload', uploadMiddleware, adminController.uploadProductImage);


// @route   POST api/admin/products
// @desc    Create a new product
// @access  Private
router.post('/products', /* auth, */ adminController.createProduct);

// @route   GET api/admin/products
// @desc    Get all admin products
// @access  Private
router.get('/products', /* auth, */ adminController.getProducts);

// @route   PUT api/admin/products/:id
// @desc    Update a product
// @access  Private
router.put('/products/:id', /* auth, */ adminController.updateProduct);

// @route   DELETE api/admin/products/:id
// @desc    Delete a product
// @access  Private
router.delete('/products/:id', /* auth, */ adminController.deleteProduct);
// ------------------------------------

module.exports = router;