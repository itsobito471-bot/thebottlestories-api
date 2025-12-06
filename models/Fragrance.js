const mongoose = require('mongoose');

const FragranceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  // --- UPDATED STRUCTURE ---
  description: {
    type: String,
    required: false
  },
  image: {
    type: String, // URL to the image
    required: false
  },
  notes: {
    top: { type: [String], default: [] },    // e.g. ["Lemon", "Bergamot"]
    middle: { type: [String], default: [] }, // e.g. ["Rose", "Jasmine"]
    base: { type: [String], default: [] }    // e.g. ["Musk", "Vanilla"]
  },
  in_stock: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Fragrance', FragranceSchema);