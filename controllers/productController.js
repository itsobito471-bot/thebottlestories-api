// controllers/productController.js

const Product = require('../models/Product');

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
      is_active: true, // Only show active products
    };

    // Text search (name & description)
    if (search) {
      const searchRegex = new RegExp(search, 'i'); // 'i' for case-insensitive
      query.$or = [
        { name: searchRegex },
        { description: searchRegex }
      ];
    }

    // Tag filter
    if (tag) {
      query.tag = tag;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Minimum rating filter
    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    // --- 2. Build Sort Options ---
    const sortOptions = {};
    switch (sort) {
      case 'price-asc':
        sortOptions.price = 1; // 1 for ascending
        break;
      case 'price-desc':
        sortOptions.price = -1; // -1 for descending
        break;
      case 'rating':
        sortOptions.rating = -1;
        break;
      case 'newest':
      default:
        sortOptions.createdAt = -1; // Default sort
    }

    // --- 3. Execute Query with Pagination ---
    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    // --- 4. Get Total Count for Pagination ---
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
      .limit(10); 

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
    const product = await Product.findById(req.params.id);

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