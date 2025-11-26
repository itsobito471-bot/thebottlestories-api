const User = require('../models/User');

// @route   GET /api/user/addresses
exports.getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('addresses');
    res.json(user.addresses);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/user/addresses
exports.addAddress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.addresses.push(req.body); // Add new address
    await user.save();
    res.json(user.addresses);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};