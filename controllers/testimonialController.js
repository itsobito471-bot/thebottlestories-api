const Testimonial = require('../models/Testimonial');

// @desc    Get all APPROVED testimonials
// @route   GET /api/testimonials/approved
// @access  Public
exports.getApprovedTestimonials = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // Default to 10
    
    const testimonials = await Testimonial.find({ isApproved: true })
      .sort({ createdAt: -1 })
      .limit(limit); // Apply limit
      
    res.json(testimonials);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Submit a testimonial
// @route   POST /api/testimonials
// @access  Public (or Private depending on your needs)
exports.createTestimonial = async (req, res) => {
  try {
    // Multer parses the text fields into req.body
    const { name, role, content, rating } = req.body;
    
    // Multer puts the single file into req.file (singular)
    let imagePath = "";
    
    if (req.file) {
      // Construct the full URL. 
      // Ensure 'process.env.BASE_URL' is set (e.g., http://localhost:5000)
      // OR just store the relative path: '/uploads/' + req.file.filename
      const baseUrl = process.env.BASE_URL || 'http://localhost:8000';
      imagePath = `${baseUrl}/uploads/${req.file.filename}`;
    }

    const newTestimonial = new Testimonial({
      name,
      role,
      content,
      rating,
      image: imagePath,
      // user: req.user ? req.user.id : null, // Use if you have auth middleware on this route
      isApproved: false 
    });

    await newTestimonial.save();

    res.status(201).json({ 
      message: 'Testimonial submitted successfully!' 
    });
  } catch (err) {
    console.error("Testimonial Error:", err);
    res.status(500).json({ message: 'Server Error' });
  }
};


// @desc    Get ALL testimonials (Admin) - with pagination & status filter
// @route   GET /api/testimonials/admin
// @access  Private (Admin)
exports.getAdminTestimonials = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status; // 'pending', 'approved', or 'all'
    const skip = (page - 1) * limit;

    let query = {};
    if (status === 'pending') query.isApproved = false;
    if (status === 'approved') query.isApproved = true;

    const testimonials = await Testimonial.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Testimonial.countDocuments(query);
    const pendingCount = await Testimonial.countDocuments({ isApproved: false });

    res.json({
      testimonials,
      stats: {
        total: await Testimonial.countDocuments(),
        pending: pendingCount
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Approve a testimonial
// @route   PATCH /api/testimonials/:id/approve
// @access  Private (Admin)
exports.approveTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    );
    if (!testimonial) return res.status(404).json({ message: 'Not found' });
    res.json(testimonial);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a testimonial
// @route   DELETE /api/testimonials/:id
// @access  Private (Admin)
exports.deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Testimonial deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};