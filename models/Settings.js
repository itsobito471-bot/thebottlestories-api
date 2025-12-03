const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  // --- Contact Information ---
  contact_email: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true
  },
  contact_phone: { 
    type: String, 
    required: true,
    trim: true 
  },

  // --- Physical Address ---
  // Nested object for cleaner organization
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zip: { type: String, default: '' },
    country: { type: String, default: 'India' }
  },

  socialLinks: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    twitter: { type: String, default: '' },
    linkedin: { type: String, default: '' }
  },

  // --- Store Configuration (Optional future proofing) ---
  currency: { type: String, default: 'INR' },
  tax_rate: { type: Number, default: 0 },
  
  // --- Audit Trail ---
  // Useful to know WHICH admin changed the settings last
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

// Prevent model overwrite error in Next.js development mode
module.exports = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);