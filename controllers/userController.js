const User = require('../models/User');
const Address = require('../models/Address');


// @desc    Get User Profile & Addresses
// @route   GET /api/user/profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    const addresses = await Address.find({ user: req.user.id }).sort({ isDefault: -1, createdAt: -1 });
    res.json({ user, addresses });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update User Info (Phone/DOB/Name)
// @route   PUT /api/user/profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, phone, dob } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { name, phone, dob }, 
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Add New Address
// @route   POST /api/user/address
exports.addAddress = async (req, res) => {
  try {
    const address = new Address({ ...req.body, user: req.user.id });
    await address.save();
    res.json(address);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete Address
// @route   DELETE /api/user/address/:id
exports.deleteAddress = async (req, res) => {
  try {
    await Address.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ message: 'Address removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};


// @desc    Upload Profile Picture
// @route   POST /api/user/avatar
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Construct URL (Adjust BASE_URL based on your environment)
    const baseUrl = process.env.BASE_URL || 'http://localhost:8000';
    const imagePath = `${baseUrl}/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: imagePath },
      { new: true } // Return updated user
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};