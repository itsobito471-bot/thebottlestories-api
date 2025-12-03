const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String, // Optional: if you want text reviews later
    default: ""
  }
}, { timestamps: true });

// COMPOUND INDEX: This is the "Lock". 
// It prevents a user from creating two reviews for the same product.
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Static method to calculate average rating after save/remove
ReviewSchema.statics.calcAverageRatings = async function(productId) {
  const stats = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        nRating: { $sum: 1 }, // Total count
        avgRating: { $avg: '$rating' } // Average (1-5)
      }
    }
  ]);

  // Update the Product document
  try {
    await mongoose.model('Product').findByIdAndUpdate(productId, {
      rating: stats.length > 0 ? stats[0].avgRating : 0,
      reviews: stats.length > 0 ? stats[0].nRating : 0
    });
  } catch (err) {
    console.error(err);
  }
};

// Call calcAverageRatings after save
ReviewSchema.post('save', function() {
  this.constructor.calcAverageRatings(this.product);
});

module.exports = mongoose.model('Review', ReviewSchema);