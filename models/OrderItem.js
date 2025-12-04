const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
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
  
  // Customizations
  selected_fragrances: [{
    fragrance: { type: mongoose.Schema.Types.ObjectId, ref: 'Fragrance' },
    size: { type: String }, // e.g., "100ml"
    label: { type: String } // e.g., "Bottle 1" or "Travel Size"
  }],
  
  custom_message: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('OrderItem', OrderItemSchema);