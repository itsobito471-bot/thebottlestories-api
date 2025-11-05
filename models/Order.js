const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  customer_name: { type: String, required: true },
  customer_email: { type: String, required: true },
  customer_phone: { type: String },
  customer_address: { type: String },
  total_amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending',
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  // We'll skip OrderItems for simplicity in this example
});

module.exports = mongoose.model('Order', OrderSchema);