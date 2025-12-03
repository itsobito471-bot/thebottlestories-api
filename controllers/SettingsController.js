const Settings = require('../models/Settings');

// @desc    Get Store Settings
// @route   GET /admin/settings
// @access  Private/Admin
const getSettings = async (req, res) => {
  try {
    // 1. Find the first (and only) settings document
    let settings = await Settings.findOne();

    // 2. If no settings exist yet, return a default empty structure
    if (!settings) {
      return res.status(200).json({
        contact_email: '',
        contact_phone: '',
        address: { street: '', city: '', state: '', zip: '', country: '' },
        socialLinks: { facebook: '', instagram: '', twitter: '' , linkedin: '' }
      });
    }

    res.status(200).json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: "Server Error fetching settings" });
  }
};

// @desc    Update Store Settings
// @route   POST /admin/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
  try {
    const { contact_email, contact_phone, address ,socialLinks} = req.body;

    // 1. Singleton Update
    // We pass an empty filter {} because we don't care about the ID.
    // We just want to find the *first* document and update it.
    const updatedSettings = await Settings.findOneAndUpdate(
      {}, // Filter: Match any document
      { 
        $set: {
          contact_email,
          contact_phone,
          address,
          // Assuming you have middleware that adds user to req (e.g., passport/jwt)
          updatedBy: req.user ? req.user._id : null ,
          socialLinks
        } 
      },
      { 
        new: true, // Return the updated document
        upsert: true, // Create if it doesn't exist
        setDefaultsOnInsert: true 
      }
    );

    res.status(200).json(updatedSettings);
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ message: "Server Error updating settings" });
  }
};

module.exports = {
  getSettings,
  updateSettings
};