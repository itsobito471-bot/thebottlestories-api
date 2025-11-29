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

  // 1. Validation: "Perfume Journey" Statuses
  const validStatuses = [
    'pending',      
    'approved',     
    'crafting',     
    'packaging',    
    'shipped',      
    'delivered',    
    'completed',    
    'cancelled',    
    'rejected'      
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      msg: `Invalid status. Allowed: ${validStatuses.join(', ')}` 
    });
  }

  try {
    // 2. Find and Update in Database
    const order = await Order.findByIdAndUpdate(
      id,
      { 
        $set: { 
          status: status, 
          updated_at: new Date() 
        } 
      },
      { new: true } // Return updated doc
    );

    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }

    // ---------------------------------------------------------
    // 3. SEND EMAIL NOTIFICATION (The New Part)
    // ---------------------------------------------------------
    
    // A. Define Content based on Status
    let emailSubject = `Update on Order #${order._id.toString().slice(-6)}`;
    let emailHeading = "Order Status Updated";
    let emailMessage = `Your order status has been updated to <strong>${status}</strong>.`;
    let color = "#1C1C1C"; // Default Black

    switch(status.toLowerCase()) {
        case 'approved':
            emailHeading = "Order Approved";
            emailMessage = "Your payment has been confirmed! We are now getting everything ready for you.";
            color = "#1C1C1C";
            break;
        case 'crafting':
            emailHeading = "We are blending your scents...";
            emailMessage = "Our artisans are currently crafting your selection. Each bottle is being prepared with care.";
            color = "#9333EA"; // Purple for luxury/crafting
            break;
        case 'packaging':
            emailHeading = "Almost ready!";
            emailMessage = "We are adding the final touches and packaging your gift hamper to ensure it arrives safely and beautifully.";
            color = "#D97706"; // Amber/Gold
            break;
        case 'shipped':
            emailSubject = `Your Order #${order._id.toString().slice(-6)} has Shipped! 🚚`;
            emailHeading = "It's on the way!";
            emailMessage = "Great news! Your package has left our facility and is making its way to you.";
            color = "#2563EB"; // Blue
            break;
        case 'delivered':
        case 'completed':
            emailSubject = `Delivered! Enjoy your Perfumes ✨`;
            emailHeading = "Package Delivered";
            emailMessage = "Your order has been marked as delivered. We hope these scents create lasting memories for you!";
            color = "#16A34A"; // Green
            break;
        case 'cancelled':
        case 'rejected':
            emailSubject = `Order #${order._id.toString().slice(-6)} Cancelled`;
            emailHeading = "Order Cancelled";
            emailMessage = "This order has been cancelled. If you believe this is a mistake, please reply to this email.";
            color = "#DC2626"; // Red
            break;
        default:
            // Keep default generic message for 'pending' or unknown
            break;
    }

    // B. Create the HTML Template
    const htmlTemplate = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <div style="background-color: #1C1C1C; padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-family: serif; letter-spacing: 1px;">The Bottle Stories</h1>
            </div>

            <div style="padding: 40px 30px; text-align: center;">
                <h2 style="color: ${color}; margin-top: 0;">${emailHeading}</h2>
                <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    ${emailMessage}
                </p>

                <div style="background-color: #fafafa; border: 1px solid #eeeeee; padding: 20px; border-radius: 8px; text-align: left; margin-bottom: 30px;">
                    <p style="margin: 5px 0; color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Order Details</p>
                    <p style="margin: 5px 0 0 0; font-weight: bold; color: #333;">Order ID: #${order._id}</p>
                    <p style="margin: 5px 0 0 0; font-weight: bold; color: #333;">New Status: <span style="color: ${color}; text-transform: capitalize;">${status}</span></p>
                </div>

                <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/my-orders" style="display: inline-block; background-color: #1C1C1C; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Your Order</a>
            </div>

            <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                <p style="color: #999999; font-size: 12px; margin: 0;">
                    Need help? Reply to this email.<br/>
                    &copy; ${new Date().getFullYear()} The Bottle Stories.
                </p>
            </div>
        </div>
      </div>
    `;

    // C. Send the Email (Fire and Forget)
    if (order.customer_email) {
        const mailOptions = {
            from: `"The Bottle Stories" <${process.env.MAIL_USERNAME}>`,
            to: order.customer_email,
            subject: emailSubject,
            html: htmlTemplate
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) console.error("❌ Status Update Email Failed:", err);
            else console.log(`✅ Email sent to ${order.customer_email}: ${info.response}`);
        });
    } else {
        console.log("⚠️ No customer email found, skipping notification.");
    }

    // 4. Return the response to Admin
    res.json(order);

  } catch (err) {
    console.error('Update Status Error:', err.message);
    
    // Handle Invalid ID format explicitly
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Order not found (Invalid ID format)' });
    }
    
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