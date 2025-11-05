const Product = require('../models/Product');
const Order = require('../models/Order');

// Get Dashboard Stats
exports.getStats = async (req, res) => {
  try {
    const [
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      approvedOrders,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ is_active: true }),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'approved' }),
    ]);

    res.json({
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      approvedOrders,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get All Orders
exports.getOrders = async (req, res) => {
  try {
    // We'll skip joining items for now to keep it simple
    const orders = await Order.find().sort({ created_at: -1 });
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Update Order Status
exports.updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const { orderId } = req.params;

  // Simple validation
  if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
    return res.status(400).json({ msg: 'Invalid status' });
  }

  try {
    const order = await Order.findByIdAndUpdate(
      orderId,
      { $set: { status: status, updated_at: new Date() } },
      { new: true } // Return the updated document
    );

    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};



exports.uploadProductImage = (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files were uploaded.' });
    }
    const serverUrl = process.env.SERVER_URL || 'http://127.0.0.1:8000';
    const urls = req.files.map(file => `${serverUrl}/uploads/${file.filename}`);

    res.status(201).json({
      message: 'Files uploaded successfully',
      urls: urls,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server error during upload' });
  }
};


// --- ADD ALL THE CODE BELOW ---

/**
 * @route   POST api/admin/products
 * @desc    Create a new product
 */
exports.createProduct = async (req, res) => {
  // Destructure all fields from the request body
  const {
    name,
    description,
    price,
    originalPrice,
    images,
    features,
    tag,
    stock_quantity,
    is_active,
  } = req.body;

  try {
    // Check if product already exists (optional)
    let product = await Product.findOne({ name });
    if (product) {
      return res.status(400).json({ message: 'Product with this name already exists' });
    }

    // Create new product instance
    product = new Product({
      name,
      description,
      price,
      originalPrice: originalPrice || null,
      images,
      features,
      tag,
      stock_quantity: stock_quantity || 0,
      is_active,
    });

    // Save to database
    await product.save();

    // Return the new product
    res.status(201).json(product);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

/**
 * @route   GET api/admin/products
 * @desc    Get all products
 */
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

/**
 * @route   PUT api/admin/products/:id
 * @desc    Update an existing product
 */
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  
  // Get all fields from the body
  const {
    name,
    description,
    price,
    originalPrice,
    images,
    features,
    tag,
    stock_quantity,
    is_active,
  } = req.body;

  // Build the product object with fields to update
  const productFields = {};
  if (name) productFields.name = name;
  if (description) productFields.description = description;
  if (price) productFields.price = price;
  if (originalPrice) productFields.originalPrice = originalPrice;
  if (images) productFields.images = images; // This will replace the whole array
  if (features) productFields.features = features; // This will replace the whole array
  if (tag) productFields.tag = tag;
  if (stock_quantity !== undefined) productFields.stock_quantity = stock_quantity;
  if (is_active !== undefined) productFields.is_active = is_active;
  
  try {
    let product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update the product
    product = await Product.findByIdAndUpdate(
      id,
      { $set: productFields },
      { new: true } // Return the modified document
    );

    res.json(product);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

/**
 * @route   DELETE api/admin/products/:id
 * @desc    Delete a product
 */
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(44).json({ message: 'Product not found' });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Product removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};