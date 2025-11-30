const mongoose = require('mongoose');

const EnquirySchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }, // For admin to track new messages
}, { timestamps: true });

module.exports = mongoose.model('Enquiry', EnquirySchema);