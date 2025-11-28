const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // One cart per user
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    },
    // Store customizations
    selected_fragrances: [{ type: String }], // Storing IDs or Names
    custom_message: { type: String }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Cart', CartSchema);