// models/Product.js

const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  
  // --- New & Updated Fields ---
  originalPrice: { type: Number, default: null }, 
  rating: { type: Number, default: 0 },          
  reviews: { type: Number, default: 0 },         
  images: { type: [String], default: [] },       
  features: { type: [String], default: [] },     
  tag: { type: String },                         
  // --- End New Fields ---

  stock_quantity: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
}, {
  // Adds created_at and updated_at automatically
  timestamps: true 
});

module.exports = mongoose.model('Product', ProductSchema);