const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const nodemailer = require('nodemailer');

// Configure Email (Use environment variables!)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// @route POST /api/orders
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, totalAmount } = req.body;
    const userId = req.user.id;

    // 1. Create the main Order document
    // We save the snapshot of the address at the time of purchase
    const newOrder = new Order({
      user: userId,
      customer_name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
      customer_email: shippingAddress.email,
      customer_phone: shippingAddress.phone,
      shipping_address: {
        street: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zip: shippingAddress.zip
      },
      total_amount: totalAmount,
      status: 'pending'
    });

    const savedOrder = await newOrder.save();

    // 2. Create separate OrderItem documents for each product
    // This is where we store the specific fragrance choices and custom messages
    const orderItems = await Promise.all(items.map(async (item) => {
      const newItem = new OrderItem({
        order: savedOrder._id,
        product: item._id,
        quantity: item.quantity,
        price_at_purchase: item.price,
        // These fields come from the cart item data we set up in the frontend
        selected_fragrances: item.selectedFragrances || [],
        custom_message: item.customMessage || ''
      });
      return await newItem.save();
    }));

    // 3. Update the main Order with the IDs of the items we just created
    savedOrder.items = orderItems.map(i => i._id);
    await savedOrder.save();

    // 4. Send Email Notification to Admin
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL, // Ensure this env var is set
      subject: `New Order #${savedOrder._id} Received!`,
      html: `
        <h1>New Order Alert!</h1>
        <p><strong>Customer:</strong> ${savedOrder.customer_name}</p>
        <p><strong>Total:</strong> ₹${savedOrder.total_amount}</p>
        <p><strong>Status:</strong> Pending</p>
        <br/>
        <h3>Order Details:</h3>
        <ul>
          ${items.map(i => `
            <li>
              <strong>${i.name}</strong> (x${i.quantity})<br/>
              <small>Fragrances: ${i.selectedFragrances?.length || 0} selected</small><br/>
              <small>Note: ${i.customMessage || 'None'}</small>
            </li>
          `).join('')}
        </ul>
      `
    };

    // Send email asynchronously (don't block the response)
    transporter.sendMail(mailOptions).catch(err => console.error("Email failed", err));

    res.status(201).json(savedOrder);

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @route PUT /api/orders/:id/status (For Admin)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        // Valid statuses: 'pending', 'preparing', 'shipped', 'delivered', 'cancelled'
        const order = await Order.findByIdAndUpdate(
            req.params.id, 
            { status }, 
            { new: true }
        );
        
        if(!order) return res.status(404).json({msg: 'Order not found'});
        
        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};