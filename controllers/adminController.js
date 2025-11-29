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
    // 3. SEND EMAIL NOTIFICATION (Visual Upgrade)
    // ---------------------------------------------------------
    
    // A. Define Colors & Messages
    let emailSubject = `Update on Order #${order._id.toString().slice(-6)}`;
    let emailHeading = "Status Update";
    let emailMessage = `The status of your order has changed.`;
    
    // We use two colors: a soft background (badgeBg) and a strong text color (badgeText)
    let badgeBg = "#f3f4f6"; 
    let badgeText = "#1f2937";

    switch(status.toLowerCase()) {
        case 'approved':
            emailHeading = "Order Confirmed";
            emailMessage = "Your payment was successful. We are now reviewing your order.";
            badgeBg = "#ecfdf5"; badgeText = "#047857"; // Emerald Green
            break;
        case 'crafting':
            emailHeading = "Blending in Progress";
            emailMessage = "Our artisans are currently crafting your scents. Your bottle story is being written.";
            badgeBg = "#f3e8ff"; badgeText = "#7e22ce"; // Purple
            break;
        case 'packaging':
            emailHeading = "Final Touches";
            emailMessage = "We are carefully packaging your gift hamper to ensure it arrives beautifully.";
            badgeBg = "#fffbeb"; badgeText = "#b45309"; // Amber/Gold
            break;
        case 'shipped':
            emailSubject = `Your Order is on the way! 🚚`;
            emailHeading = "Shipped";
            emailMessage = "Your package has left our facility! It is making its way to you.";
            badgeBg = "#eff6ff"; badgeText = "#1d4ed8"; // Blue
            break;
        case 'delivered':
        case 'completed':
            emailSubject = `Delivered! ✨`;
            emailHeading = "Arrived";
            emailMessage = "Your order has been marked as delivered. We hope you enjoy your new scents.";
            badgeBg = "#f0fdf4"; badgeText = "#15803d"; // Green
            break;
        case 'cancelled':
        case 'rejected':
            emailSubject = `Order Cancelled`;
            emailHeading = "Cancelled";
            emailMessage = "This order has been cancelled. If you have questions, please contact support.";
            badgeBg = "#fef2f2"; badgeText = "#b91c1c"; // Red
            break;
        default:
            break;
    }

    // B. The "Nice Looking" HTML Template
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #FDFBF7; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FDFBF7; padding: 40px 0;">
          <tr>
            <td align="center">
              
              <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); overflow: hidden; max-width: 600px; width: 100%;">
                
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #f0f0f0;">
                    <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 28px; color: #1C1C1C; letter-spacing: -0.5px;">The Bottle Stories</h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 40px 40px;">
                    <div style="text-align: center;">
                      
                      <div style="display: inline-block; background-color: ${badgeBg}; color: ${badgeText}; padding: 8px 20px; border-radius: 50px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 20px;">
                        ${status}
                      </div>

                      <h2 style="margin: 0 0 15px 0; color: #1C1C1C; font-size: 24px;">${emailHeading}</h2>
                      <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                        ${emailMessage}
                      </p>

                      <div style="height: 1px; background-color: #f0f0f0; margin: 30px 0;"></div>

                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                        <tr>
                          <td style="padding-bottom: 10px; color: #999999; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Order Number</td>
                          <td style="padding-bottom: 10px; text-align: right; color: #1C1C1C; font-weight: bold;">#${order._id.toString().toUpperCase()}</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 10px; color: #999999; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Date Updated</td>
                          <td style="padding-bottom: 10px; text-align: right; color: #1C1C1C; font-weight: bold;">${new Date().toLocaleDateString()}</td>
                        </tr>
                      </table>

                      <div style="margin-top: 35px;">
                        <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/my-orders" style="background-color: #1C1C1C; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; transition: background-color 0.3s;">
                          Track Your Order
                        </a>
                      </div>

                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="background-color: #fafafa; padding: 30px; text-align: center;">
                    <p style="margin: 0; color: #999999; font-size: 13px; line-height: 1.5;">
                      Questions? Just reply to this email.<br>
                      &copy; ${new Date().getFullYear()} The Bottle Stories. All rights reserved.
                    </p>
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
            else console.log(`✅ Status Email Sent: ${info.response}`);
        });
    }

    // 4. Return Updated Order
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