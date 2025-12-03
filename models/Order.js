const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Shipping Details
  customer_name: { type: String, required: true },
  customer_email: { type: String, required: true },
  customer_phone: { type: String },
  
  // Address Details
  shipping_address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  
  // --- NEW: Tracking Information ---
  trackingId: { type: String, default: '' },
  trackingUrl: { type: String, default: '' },
  
  // Order Items
  items: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OrderItem'
  }],

  total_amount: { type: Number, required: true },
  
  status: {
    type: String,
   enum: [
        'pending', 
        'approved', 
        'preparing', 
        'crafting', 
        'packaging', 
        'shipped', 
        'delivered', 
        'completed', 
        'cancelled', 
        'rejected'
    ],
    default: 'pending',
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);