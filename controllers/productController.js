// controllers/productController.js

const Product = require('../models/Product');
const Review = require('../models/Review');
/**
 * @route   GET /api/products/filter
 * @desc    Get products with advanced filtering, sorting, and pagination
 * @access  Public
 */
exports.filterProducts = async (req, res) => {
  try {
    // --- 1. Build Query Object ---
    const {
      search,
      tag,
      minPrice,
      maxPrice,
      minRating,
      sort,
      page = 1,
      limit = 10
    } = req.query;

    const query = {
      is_active: true,
    };

    // Text search
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { description: searchRegex }
      ];
    }

    // Tag filter
    if (tag) {
      // NOTE: If 'tag' comes in as an ID, this works. 
      // If 'tag' comes in as a name (e.g., "Best Seller"), you might need to adjust this logic.
      query.tags = tag;
    }

    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Rating
    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    // --- 2. Build Sort Options ---
    const sortOptions = {};
    switch (sort) {
      case 'price-asc': sortOptions.price = 1; break;
      case 'price-desc': sortOptions.price = -1; break;
      case 'rating': sortOptions.rating = -1; break;
      case 'newest':
      default: sortOptions.createdAt = -1;
    }

    // --- 3. Execute Query with Pagination ---
    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(query)
      // 👇 THIS IS THE FIX 👇
      .populate('available_fragrances', 'name',) // Replaces IDs with Fragrance Objects (only name and _id)
      .populate('tags', 'name color')           // Recommended: Populate tags too so you get tag names, not just IDs
      // 👆 ------------------ 👆
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    // --- 4. Get Total Count ---
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / Number(limit));

    res.json({
      products,
      currentPage: Number(page),
      totalPages,
      totalProducts,
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};


/**
 * @route   GET /api/products/preferred
 * @desc    Get top 10 most preferred (highest rated) products
 * @access  Public
 */
exports.getMostPreferredProducts = async (req, res) => {
  try {
    // Find active products, sort by rating (highest first), and take the top 10
    const products = await Product.find({ is_active: true })
      .sort({ rating: -1 }) // -1 for descending
      .limit(10)
      // --- POPULATE REFERENCES ---
      .populate('tags', 'name') // Populate Tag names
      .populate('available_fragrances', 'name in_stock notes'); // Populate Fragrance details

    res.json(products);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};


/**
 * @route   GET /api/products/:id
 * @desc    Get a single product by its ID
 * @access  Public
 */
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      // --- FIX IS HERE ---
      // Combine fields into one string: 'name in_stock'
      .populate('available_fragrances', 'name in_stock image description notes')
      .populate('tags', 'name'); // Removed 'color' unless you added it to the Tag schema

    // Check if product exists and is active
    if (!product || !product.is_active) {
      return res.status(404).json({ msg: 'Product not found' });
    }

    res.json(product);

  } catch (err) {
    console.error(err.message);
    // Handle invalid MongoDB ID format
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Product not found' });
    }
    res.status(500).send('Server Error');
  }
};
/**
 * @route   GET /api/products/all/ids
 * @desc    Get all active product IDs
 * @access  Public
 */
exports.getAllProductIds = async (req, res) => {
  try {
    // Find all active products and select *only* the _id field
    const products = await Product.find({ is_active: true }).select('_id');

    // Map the array of objects to an array of strings
    const ids = products.map(product => product._id.toString());

    res.json(ids);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};



// @desc    Rate a product
// @route   POST /api/products/:id/rate
exports.rateProduct = async (req, res) => {
  try {
    const { rating } = req.body;
    const productId = req.params.id;
    const userId = req.user.id; // Assuming you have auth middleware

    // 1. Check if user already rated
    const alreadyRated = await Review.findOne({ product: productId, user: userId });

    if (alreadyRated) {
      // Option A: Return error (Lock)
      return res.status(400).json({ message: 'You have already rated this product' });

      // Option B: Update existing rating (Unlock/Update)
      // alreadyRated.rating = rating;
      // await alreadyRated.save();
      // return res.json({ message: 'Rating updated' });
    }

    // 2. Create Review
    await Review.create({
      product: productId,
      user: userId,
      rating: Number(rating)
    });

    res.status(201).json({ message: 'Rating added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};


// @desc    Get current user's rating for a product
// @route   GET /api/products/:id/user-rating
// @access  Private
exports.getUserRating = async (req, res) => {
  try {
    const review = await Review.findOne({
      product: req.params.id,
      user: req.user.id
    });

    if (!review) {
      return res.json({ hasRated: false, rating: 0 });
    }

    res.json({ hasRated: true, rating: review.rating });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};