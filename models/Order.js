const mongoose = require('mongoose');

// Sub-schema for individual items within an order
const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price_at_purchase: { 
    type: Number, 
    required: true 
  },
  
  // --- User Choices ---
  // The specific scents the user picked from the 'available_fragrances' list
  selected_fragrances: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fragrance'
  }],
  
  // The note they wrote (if product.allow_custom_message was true)
  custom_message: {
    type: String,
    default: ''
  }
});

const OrderSchema = new mongoose.Schema({
  // Link to the registered user (if they are logged in)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Contact Info
  customer_name: { type: String, required: true },
  customer_email: { type: String, required: true },
  customer_phone: { type: String },
  customer_address: { type: String },
  
  // --- Order Details ---
  items: [OrderItemSchema], // Array of items with choices
  total_amount: { type: Number, required: true },
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending',
  },
  
  // --- Audit Trail (for internal processing) ---
  // If an admin manually creates an order for a client
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);