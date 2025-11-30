// ... imports
const userController = require('../controllers/userController');
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

// User Routes
router.get('/user/addresses', auth, userController.getAddresses);
router.post('/user/addresses', auth, userController.addAddress);

// Order Routes
router.post('/orders', auth, orderController.createOrder);


// Admin only route for status updates
router.put('/admin/orders/:id/status', auth, orderController.updateOrderStatus);

module.exports = router;