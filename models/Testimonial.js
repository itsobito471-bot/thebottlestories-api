const mongoose = require('mongoose');

const TestimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String, // e.g., "Customer", "Verified Buyer"
    default: "Customer"
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  image: {
    type: String, // URL to the uploaded image
    default: "" // You might want a default avatar URL here
  },
  isApproved: {
    type: Boolean,
    default: false // Admin must approve this manually
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Optional link if user is logged in
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Testimonial', TestimonialSchema);