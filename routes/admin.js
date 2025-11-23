const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');
// const auth = require('../middleware/auth')
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
router.post('/products',authMiddleware , adminController.createProduct);

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



router.get('/tags', adminController.getTags);
router.get('/fragrances', adminController.getFragrances);


// --- Tags ---
// router.get('/tags', adminController.getTags);
router.post('/tags', authMiddleware, adminController.createTag); // Protected
router.delete('/tags/:id', authMiddleware, adminController.deleteTag); // Protected

// --- Fragrances ---
// router.get('/fragrances', adminController.getFragrances);
router.post('/fragrances', authMiddleware, adminController.createFragrance); // Protected
router.put('/fragrances/:id', authMiddleware, adminController.updateFragrance); // Protected
router.delete('/fragrances/:id', authMiddleware, adminController.deleteFragrance); // Protected


module.exports = router;