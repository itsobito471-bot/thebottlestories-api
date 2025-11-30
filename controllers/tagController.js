const Tag = require('../models/Tag');

// @desc    Get all tags
// @route   GET /api/tags
// @access  Public
exports.getAllTags = async (req, res) => {
  try {
    // Return just the name and ID, sorted alphabetically
    const tags = await Tag.find({})
      .select('name _id')
      .sort({ name: 1 });
      
    res.json(tags);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};