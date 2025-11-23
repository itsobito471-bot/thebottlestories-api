const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address'],
  },
  password: {
    type: String,
    minlength: 6,
    // Not required: true, because users logging in via Google/Facebook won't have a password
  },
  
  // --- NEW: Role Management ---
  // This allows you to set permissions and track who did what.
  role: {
    type: String,
    enum: ['admin', 'worker', 'customer'], // Only these values are allowed
    default: 'customer' // Default role for people signing up on the website
  }
  
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);