// ... imports
const userController = require('../controllers/userController');
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');

const upload = require('../middleware/upload');

const router = require('express').Router();





// Order Routes
router.post('/orders', auth, orderController.createOrder);


// Admin only route for status updates
router.put('/admin/orders/:id/status', auth, orderController.updateOrderStatus);


router.get('/profile', auth, userController.getUserProfile);
router.put('/profile', auth, userController.updateUserProfile);
router.post('/address', auth, userController.addAddress);
router.delete('/address/:id', auth, userController.deleteAddress);
router.post('/avatar', auth, upload.single('image'), userController.uploadAvatar);

module.exports = router;