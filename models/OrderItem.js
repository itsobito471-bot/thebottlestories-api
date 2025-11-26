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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fragrance'
  }],
  
  custom_message: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('OrderItem', OrderItemSchema);