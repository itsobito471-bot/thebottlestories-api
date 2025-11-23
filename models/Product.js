const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  
  originalPrice: { type: Number, default: null },
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  images: { type: [String], default: [] },
  features: { type: [String], default: [] }, // Simple strings for bullet points
  
  // --- Relations (Multi-select) ---
  // Instead of a simple string, we reference the Tag model
  tags: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tag' 
  }], 

  // --- Fragrance Selection Setup ---
  // This lists which fragrances are AVAILABLE for this specific hamper
  available_fragrances: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Fragrance' 
  }],

  // --- Customization Setup ---
  // Admin checks this box to let users type a custom note
  allow_custom_message: { 
    type: Boolean, 
    default: false 
  },

  stock_quantity: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },

  // --- Audit Trail ---
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);