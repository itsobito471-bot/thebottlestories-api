// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['admin', 'worker', 'customer'], default: 'customer' },
  
  // --- NEW: Store multiple addresses ---
  addresses: [{
    firstName: String,
    lastName: String,
    address: String,
    city: String,
    state: String,
    zip: String,
    phone: String
  }],

  profilePicture: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);