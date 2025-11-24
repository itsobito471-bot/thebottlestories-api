// controllers/orderController.js
const Order = require('../models/Order');
const User = require('../models/User'); // If you need to update user history
const nodemailer = require('nodemailer');

// Configure Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // Or your SMTP provider
  auth: {
    user: process.env.EMAIL_USER, // Put your gmail in .env
    pass: process.env.EMAIL_PASS  // Put your App Password in .env
  }
});

exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, totalAmount } = req.body;
    const userId = req.user.id; // From auth middleware

    // 1. Create the Order
    const newOrder = new Order({
      user: userId,
      customer_name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
      customer_email: shippingAddress.email,
      customer_phone: shippingAddress.phone,
      customer_address: `${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.zip}`,
      
      items: items.map(item => ({
        product: item._id,
        quantity: item.quantity,
        price_at_purchase: item.price
      })),
      total_amount: totalAmount,
      status: 'pending'
    });

    await newOrder.save();

    // 2. Save Address to User Profile (Optional, but good UX)
    await User.findByIdAndUpdate(userId, {
      $addToSet: { addresses: shippingAddress } // Adds only if unique
    });

    // 3. Send Email to Admin
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'admin@thebottlestories.com', // Change to your admin email
      subject: `New Order #${newOrder._id} Received!`,
      html: `
        <h2>New Order Alert!</h2>
        <p><strong>Customer:</strong> ${newOrder.customer_name}</p>
        <p><strong>Amount:</strong> ₹${newOrder.total_amount}</p>
        <h3>Items:</h3>
        <ul>
          ${items.map(item => `<li>${item.name} x ${item.quantity}</li>`).join('')}
        </ul>
        <p>Login to admin panel to process.</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json(newOrder);

  } catch (err) {
    console.error("Order Error:", err);
    res.status(500).send('Server Error');
  }
};