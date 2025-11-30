const Enquiry = require('../models/Enquiry');

// @desc    Submit a new enquiry (Public)
// @route   POST /api/enquiries
const createEnquiry = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;
    
    const newEnquiry = await Enquiry.create({
      firstName,
      lastName,
      email,
      phone,
      message
    });

    res.status(201).json(newEnquiry);
  } catch (error) {
    console.error("Error creating enquiry:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

// @desc    Get all enquiries (Admin)
// @route   GET /admin/enquiries
// @desc    Get paginated enquiries (Admin)
// @route   GET /admin/enquiries?page=1&limit=10
const getEnquiries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Run queries in parallel for performance
    const [enquiries, total, unreadCount] = await Promise.all([
      Enquiry.find()
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(limit),
      Enquiry.countDocuments(),
      Enquiry.countDocuments({ isRead: false })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      enquiries,
      stats: {
        total,
        unread: unreadCount
      },
      pagination: {
        currentPage: page,
        totalPages,
        hasMore: page < totalPages,
        totalItems: total
      }
    });
  } catch (error) {
    console.error("Error fetching enquiries:", error);
    res.status(500).json({ message: "Failed to fetch enquiries" });
  }
};

// @desc    Mark enquiry as read (Admin)
// @route   PATCH /admin/enquiries/:id/read
const markEnquiryRead = async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id, 
      { isRead: true },
      { new: true }
    );
    res.status(200).json(enquiry);
  } catch (error) {
    res.status(500).json({ message: "Failed to update status" });
  }
};

module.exports = { createEnquiry, getEnquiries, markEnquiryRead };