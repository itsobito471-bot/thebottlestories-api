const Product = require('../models/Product');
const Order = require('../models/Order');
const Tag = require('../models/Tag');
const Fragrance = require('../models/Fragrance');
const orderItem = require('../models/OrderItem');

const nodemailer = require('nodemailer'); // <--- IMPORT 1

// <--- TRANSPORTER MUST BE HERE (Outside the function) ---
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SERVER,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD
  }
});

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
/**
 * @route   GET api/admin/orders
 * @desc    Get all orders with full details (Populated)
 * @access  Private
 */
exports.getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { search, status } = req.query;
    const skip = (page - 1) * limit;

    // 1. Build Filter Query
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      // Check if search looks like a valid ObjectId to prevent casting errors
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(search);

      if (isObjectId) {
        // If it looks like an ID, search by ID OR fields
        query.$or = [
          { _id: search },
          { customer_name: searchRegex },
          { customer_email: searchRegex }
        ];
      } else {
        // Otherwise search just text fields
        query.$or = [
          { customer_name: searchRegex },
          { customer_email: searchRegex }
        ];
      }
    }

    // 2. Fetch Paginated Data
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'items',
        populate: [
          { path: 'product', select: 'name images price' },
          { path: 'selected_fragrances', select: 'name' }
        ]
      })
      .populate('user', 'name email');

    // 3. Pagination Metadata
    const totalFiltered = await Order.countDocuments(query);
    const hasMore = skip + orders.length < totalFiltered;

    // 4. Calculate Global Stats (Independent of pagination)
    // Revenue: Exclude 'pending', 'rejected', 'cancelled'
    const revenueStats = await Order.aggregate([
      { 
        $match: { 
          status: { $nin: ['pending', 'rejected', 'cancelled'] } 
        } 
      },
      { 
        $group: { 
          _id: null, 
          totalRevenue: { $sum: "$total_amount" } 
        } 
      }
    ]);

    const totalRevenue = revenueStats.length > 0 ? revenueStats[0].totalRevenue : 0;
    const pendingCount = await Order.countDocuments({ status: 'pending' });
    const totalOrdersCount = await Order.countDocuments();

    res.json({
      orders,
      pagination: {
        page,
        hasMore,
        totalFiltered
      },
      stats: {
        revenue: totalRevenue,
        total: totalOrdersCount,
        pending: pendingCount
      }
    });

  } catch (err) {
    console.error("Get Orders Error:", err.message);
    res.status(500).send('Server error');
  }
};


// Update Order Status
exports.updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  console.log(`Updating Order ${id} to status: ${status}`);

  // 1. Validation
  const validStatuses = [
    'pending', 'approved', 'crafting', 'packaging', 
    'shipped', 'delivered', 'completed', 'cancelled', 'rejected'
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      msg: `Invalid status. Allowed: ${validStatuses.join(', ')}` 
    });
  }

  try {
    // 2. Find and Update
    const order = await Order.findByIdAndUpdate(
      id,
      { $set: { status: status, updated_at: new Date() } },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }

    // ---------------------------------------------------------
    // 3. THE "MAGICAL" EMAIL CONTENT
    // ---------------------------------------------------------
    
    // We use Golden/Luxury Colors
    const gold = "#D4AF37"; 
    const dark = "#1C1C1C";
    const cream = "#FDFBF7";

    let emailSubject = `A New Chapter for Order #${order._id.toString().slice(-6)}`;
    let emailHeading = "The Story Continues";
    let emailMessage = "Your order status has been updated.";
    let icon = "✨"; // Default sparkle

    // Magicial Copywriting based on status
    switch(status.toLowerCase()) {
        case 'approved':
            emailHeading = "The Journey Begins";
            emailMessage = "Your request has been accepted. We are now preparing the canvas for your olfactory story.";
            icon = "🖋️";
            break;
        case 'crafting':
            emailHeading = "The Art of Blending";
            emailMessage = "Our artisans are currently in the atelier, awakening the notes of your fragrance. Alchemy is in progress.";
            icon = "🧪";
            break;
        case 'packaging':
            emailHeading = "Wrapped in Mystery";
            emailMessage = "We are adding the final touches of elegance to your hamper, ensuring it is as beautiful as the scent within.";
            icon = "🎁";
            break;
        case 'shipped':
            emailSubject = `Your Scent has Taken Flight 🕊️`;
            emailHeading = "On the Winds";
            emailMessage = "Your bottle has left our atelier and is traveling across the miles to find you.";
            icon = "🕊️";
            break;
        case 'delivered':
        case 'completed':
            emailSubject = `The Story is Yours ✨`;
            emailHeading = "A New Memory";
            emailMessage = "Your bottle has arrived. Unbox the magic, wear the story, and let the memories begin.";
            icon = "✨";
            break;
        case 'cancelled':
        case 'rejected':
            emailSubject = `Update on Order #${order._id.toString().slice(-6)}`;
            emailHeading = "The Page Turns Back";
            emailMessage = "Your order has been cancelled. If you wish to rewrite this story, please contact us.";
            icon = "🍂";
            break;
        default:
            break;
    }

    // "Perfumy/Magical" HTML Template
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: ${cream}; font-family: 'Georgia', 'Times New Roman', serif;">
        
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${cream}; padding: 60px 0;">
          <tr>
            <td align="center">
              
              <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; border: 1px solid #E5D5C0; background-color: #ffffff; padding: 10px;">
                <tr>
                  <td>
                    <div style="border: 1px solid ${gold}; padding: 40px; text-align: center;">
                      
                      <p style="text-transform: uppercase; letter-spacing: 2px; font-size: 10px; color: #999; margin-bottom: 10px;">Est. 2024</p>
                      <h1 style="margin: 0 0 30px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 32px; color: ${dark}; font-weight: 400; letter-spacing: 1px;">
                        The Bottle Stories
                      </h1>

                      <div style="width: 40px; height: 1px; background-color: ${gold}; margin: 0 auto 30px auto;"></div>

                      <div style="font-size: 32px; margin-bottom: 20px;">${icon}</div>

                      <p style="color: ${gold}; text-transform: uppercase; letter-spacing: 2px; font-size: 12px; font-weight: bold; margin-bottom: 15px;">
                        Status: ${status}
                      </p>

                      <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: ${dark}; margin: 0 0 20px 0; font-style: italic;">
                        ${emailHeading}
                      </h2>

                      <p style="color: #555; font-size: 16px; line-height: 1.8; margin-bottom: 40px; max-width: 400px; margin-left: auto; margin-right: auto;">
                        ${emailMessage}
                      </p>

                      <div style="background-color: ${cream}; padding: 25px; margin-bottom: 40px;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td align="left" style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888;">Order Reference</td>
                            <td align="right" style="font-family: 'Courier New', monospace; font-size: 14px; color: ${dark};">#${order._id.toString().toUpperCase().slice(-8)}</td>
                          </tr>
                        </table>
                      </div>

                      <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/my-orders" style="display: inline-block; border: 1px solid ${dark}; color: ${dark}; text-decoration: none; padding: 12px 30px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; transition: all 0.3s ease;">
                        View Your Collection
                      </a>

                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px;">
                <tr>
                  <td align="center" style="color: #999; font-size: 12px; font-family: sans-serif;">
                    <p>&copy; ${new Date().getFullYear()} The Bottle Stories.<br>Every scent creates a memory.</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // C. Send Email
    if (order.customer_email) {
        const mailOptions = {
            from: `"The Bottle Stories" <${process.env.MAIL_USERNAME}>`,
            to: order.customer_email,
            subject: emailSubject,
            html: htmlTemplate
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) console.error("❌ Status Email Failed:", err);
            else console.log(`✅ Magic Sent: ${info.response}`);
        });
    }

    res.json(order);

  } catch (err) {
    console.error('Update Status Error:', err.message);
    if (err.kind === 'ObjectId') return res.status(404).json({ msg: 'Order not found' });
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


// ... other imports

/**
 * @route   POST api/admin/products
 * @desc    Create a new product
 */
exports.createProduct = async (req, res) => {
  const {
    name,
    description,
    price,
    originalPrice,
    images,
    features,
    // Note: If you updated your frontend to send 'tags' and 'available_fragrances' as arrays,
    // make sure to destructure them here too.
    tags, 
    available_fragrances, 
    allow_custom_message,
    stock_quantity,
    is_active,
  } = req.body;

  try {
    // 1. Check if product already exists
    let product = await Product.findOne({ name });
    if (product) {
      return res.status(400).json({ message: 'Product with this name already exists' });
    }

    // 2. Get the Logged-in User's ID
    // req.user is set by your 'auth' middleware
    const userId = req.user.id; 

    // 3. Create new product instance
    product = new Product({
      name,
      description,
      price,
      originalPrice: originalPrice || null,
      images,
      features,
      
      // Map the new relational fields (if sent from frontend)
      tags: tags || [],
      available_fragrances: available_fragrances || [],
      allow_custom_message: allow_custom_message || false,

      stock_quantity: stock_quantity || 0,
      is_active,

      // --- AUDIT TRAIL ---
      createdBy: userId, // Saves the ID of the admin/worker who created it
      updatedBy: userId  // The creator is also the first updater
    });

    // 4. Save to database
    await product.save();

    res.status(201).json(product);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

/**
 * @route   GET api/products (or api/admin/products)
 * @desc    Get products with pagination and fully populated fields
 * @access  Public/Private
 */
exports.getProducts = async (req, res) => {
  try {
    // 1. Pagination Setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items
    const skip = (page - 1) * limit;

    // 2. Build Query (Optional: Add search/filtering here if needed)
    const query = {}; 
    // If this is the public endpoint, usually you only show active products:
    // if (!req.user) query.is_active = true; 

    // 3. Fetch Data
    const products = await Product.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      // --- POPULATE REFERENCES ---
      // This swaps the IDs for the actual data objects
      .populate('tags', 'name') // Get Tag names
      .populate('available_fragrances', 'name in_stock notes') // Get Fragrance details
      .populate('createdBy', 'name') // (Optional) Get creator name
      .populate('updatedBy', 'name');

    // 4. Get Total Count (for frontend to know when to stop loading)
    const total = await Product.countDocuments(query);
    const hasMore = skip + products.length < total;

    // 5. Send Response
    res.json({
      data: products,
      page,
      limit,
      total,
      hasMore
    });

  } catch (err) {
    console.error("Error fetching products:", err.message);
    res.status(500).send('Server error');
  }
};

// Use the exact same logic for getAdminProducts if it's a separate function
exports.getAdminProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('tags', 'name') 
      .populate('available_fragrances', 'name in_stock');

    const total = await Product.countDocuments();
    const hasMore = skip + products.length < total;

    res.json({
      data: products,
      page,
      hasMore,
      total
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

/**
 * @route   PUT api/admin/products/:id
 * @desc    Update an existing product
 */
// controllers/adminController.js

/**
 * @route   PUT api/admin/products/:id
 * @desc    Update a product
 */
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  
  // 1. Get all fields (including the NEW ones) from the body
  const {
    name,
    description,
    price,
    originalPrice,
    images,
    features,
    tags,                 // <-- Added
    available_fragrances, // <-- Added
    allow_custom_message, // <-- Added
    stock_quantity,
    is_active,
  } = req.body;

  // 2. Build the product object with fields to update
  const productFields = {};
  
  if (name) productFields.name = name;
  if (description) productFields.description = description;
  if (price) productFields.price = price;
  // Check specifically for undefined so we can set it to null/0 if sent
  if (originalPrice !== undefined) productFields.originalPrice = originalPrice;
  
  if (images) productFields.images = images; 
  if (features) productFields.features = features; 
  
  // --- NEW FIELDS UPDATES ---
  if (tags) productFields.tags = tags;
  if (available_fragrances) productFields.available_fragrances = available_fragrances;
  if (typeof allow_custom_message !== 'undefined') productFields.allow_custom_message = allow_custom_message;
  // --------------------------

  if (stock_quantity !== undefined) productFields.stock_quantity = stock_quantity;
  if (is_active !== undefined) productFields.is_active = is_active;
  
  // 3. Add Audit Trail (Who updated this?)
  if (req.user) {
    productFields.updatedBy = req.user.id;
  }

  try {
    let product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update the product
    product = await Product.findByIdAndUpdate(
      id,
      { $set: productFields },
      { new: true } // Return the modified document so frontend updates immediately
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
    const productId = req.params.id;

    // 1. Check if product exists
    const product = await Product.findById(productId);

    if (!product) {
      // Note: Standard HTTP code for Not Found is 404, corrected from 44
      return res.status(404).json({ message: 'Product not found' });
    }

    // 2. CHECK FOR DEPENDENCIES (The Fix)
    // We check if this product ID exists in the OrderItem collection
    const isOrdered = await orderItem.findOne({ product: productId });

    if (isOrdered) {
      // If found, return a 400 Bad Request error
      return res.status(400).json({ 
        message: 'Cannot delete product. It has been purchased in previous orders. Consider archiving/deactivating it instead.' 
      });
    }

    // 3. Delete if no dependencies found
    await Product.findByIdAndDelete(productId);

    res.json({ message: 'Product removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};


/**
 * @route   GET api/admin/tags
 * @desc    Get tags with pagination
 */
exports.getTags = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const tags = await Tag.find()
      .sort({ name: 1 }) // Alphabetical order
      .skip(skip)
      .limit(limit);

    const total = await Tag.countDocuments();
    const hasMore = skip + tags.length < total;

    res.json({
      data: tags,
      hasMore,
      page,
      total
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

/**
 * @route   GET api/admin/fragrances
 * @desc    Get fragrances with pagination
 */
exports.getFragrances = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const fragrances = await Fragrance.find()
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Fragrance.countDocuments();
    const hasMore = skip + fragrances.length < total;

    res.json({
      data: fragrances,
      hasMore,
      page,
      total
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};


/**
 * @route   POST api/admin/tags
 * @desc    Create a new tag
 */
exports.createTag = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id; // From auth middleware

    let tag = await Tag.findOne({ name });
    if (tag) {
      return res.status(400).json({ message: 'Tag already exists' });
    }

    tag = new Tag({
      name,
      createdBy: userId
    });

    await tag.save();
    res.status(201).json(tag);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

/**
 * @route   DELETE api/admin/tags/:id
 * @desc    Delete a tag
 */
exports.deleteTag = async (req, res) => {
  try {
    await Tag.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tag removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// --- FRAGRANCES OPERATIONS ---

/**
 * @route   POST api/admin/fragrances
 * @desc    Create a new fragrance
 */
const parseNotes = (str) => {
  if (!str || typeof str !== 'string') return [];
  return str.split(',').map(item => item.trim()).filter(item => item !== '');
};

exports.createFragrance = async (req, res) => {
  try {
    // Receive strings from frontend
    const { name, topNotes, middleNotes, baseNotes, in_stock } = req.body;
    const userId = req.user.id;

    const fragrance = new Fragrance({
      name,
      // Convert strings to arrays
      notes: {
        top: parseNotes(topNotes),
        middle: parseNotes(middleNotes),
        base: parseNotes(baseNotes)
      },
      in_stock: in_stock !== undefined ? in_stock : true,
      createdBy: userId
    });

    await fragrance.save();
    res.status(201).json(fragrance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
/**
 * @route   DELETE api/admin/fragrances/:id
 * @desc    Delete a fragrance
 */
exports.deleteFragrance = async (req, res) => {
  try {
    await Fragrance.findByIdAndDelete(req.params.id);
    res.json({ message: 'Fragrance removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

/**
 * @route   PUT api/admin/fragrances/:id
 * @desc    Update fragrance details (like stock status)
 */
exports.updateFragrance = async (req, res) => {
  try {
    const fragrance = await Fragrance.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json(fragrance);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};