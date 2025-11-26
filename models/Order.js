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
  
  // Address Details (Snapshot of the address at time of order)
  shipping_address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  
  // Reference to separate OrderItem documents
  items: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OrderItem'
  }],

  total_amount: { type: Number, required: true },
  
  status: {
    type: String,
    enum: ['pending', 'preparing', 'shipped', 'delivered', 'cancelled'], // Expanded status list
    default: 'pending',
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);