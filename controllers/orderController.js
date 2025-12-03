const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const nodemailer = require('nodemailer');

// Configure Email (Use environment variables!)
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SERVER,     // smtp.gmail.com
  port: Number(process.env.MAIL_PORT), // 587
  secure: false, // true for 465, false for other ports (587)
  auth: {
    user: process.env.MAIL_USERNAME, // anwaradil295@gmail.com
    pass: process.env.MAIL_PASSWORD  // The 16-digit App Password
  }
});

// @route POST /api/orders
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, totalAmount } = req.body;
    const userId = req.user.id;

    // 1. Create Order
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

    // 2. Create Order Items
    const orderItems = await Promise.all(items.map(async (item) => {
      const newItem = new OrderItem({
        order: savedOrder._id,
        product: item._id,
        quantity: item.quantity,
        price_at_purchase: item.price,
        selected_fragrances: item.selectedFragrances || [],
        custom_message: item.customMessage || ''
      });
      return await newItem.save();
    }));

    // 3. Update Order with Items
    savedOrder.items = orderItems.map(i => i._id);
    await savedOrder.save();

    // 4. Prepare Email Content
    // NOTE: You are sending this TO yourself (Admin)
    const mailOptions = {
      from: `"Bottle Stories" <${process.env.MAIL_USERNAME}>`, // Sender address
      to: process.env.MAIL_USERNAME, // Sending to yourself (Admin)
      subject: `🔔 New Order #${savedOrder._id.toString().slice(-6)} Received!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1C1C1C;">New Order Alert!</h2>
          <p>You have received a new order from <strong>${savedOrder.customer_name}</strong>.</p>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Order ID:</strong> ${savedOrder._id}</p>
            <p style="margin: 5px 0;"><strong>Total Amount:</strong> ₹${savedOrder.total_amount}</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${savedOrder.customer_phone}</p>
            <p style="margin: 5px 0;"><strong>Address:</strong> ${savedOrder.shipping_address.street}, ${savedOrder.shipping_address.city}</p>
          </div>

          <h3>Order Details:</h3>
          <ul style="list-style: none; padding: 0;">
            ${items.map(i => `
              <li style="border-bottom: 1px solid #eee; padding: 10px 0;">
                <strong>${i.name}</strong> (Qty: ${i.quantity})<br/>
                ${i.selectedFragrances?.length ? `<span style="color: #666; font-size: 14px;">Fragrances: ${i.selectedFragrances.join(', ')}</span><br/>` : ''}
                ${i.customMessage ? `<span style="color: #666; font-size: 14px;">Note: "${i.customMessage}"</span>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      `
    };

    // 5. Send Email (Added logging for debugging)
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("❌ Email Error:", error);
      } else {
        console.log("✅ Email sent: " + info.response);
      }
    });

    res.status(201).json(savedOrder);

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @route PUT /api/orders/:id/status (For Admin)
// @route PUT /api/orders/:id/status (For Admin)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        // 1. Update the Order in DB
        const order = await Order.findByIdAndUpdate(
            req.params.id, 
            { status }, 
            { new: true }
        );
        
        if(!order) return res.status(404).json({msg: 'Order not found'});

        // 2. Prepare Status-Specific Content
        let emailSubject = `Update on Order #${order._id}`;
        let emailHeading = "Order Status Updated";
        let emailMessage = `Your order is now <strong>${status}</strong>.`;
        let color = "#1C1C1C"; // Default Black

        switch(status.toLowerCase()) {
            case 'preparing':
                emailHeading = "We are packing your order!";
                emailMessage = "Our team is currently preparing your perfumes with care. We will notify you once it ships.";
                break;
            case 'shipped':
                emailSubject = `Your Order #${order._id} has Shipped! 🚚`;
                emailHeading = "On its way!";
                emailMessage = "Great news! Your order has been dispatched and is making its way to you.";
                color = "#2563EB"; // Blue
                break;
            case 'delivered':
                emailSubject = `Delivered! Enjoy your Perfumes ✨`;
                emailHeading = "Package Delivered";
                emailMessage = "Your order has been marked as delivered. We hope you enjoy your scents! Every bottle tells a story.";
                color = "#16A34A"; // Green
                break;
            case 'cancelled':
                emailSubject = `Order #${order._id} Cancelled`;
                emailHeading = "Order Cancelled";
                emailMessage = "Your order has been cancelled. If you did not request this, please contact support immediately.";
                color = "#DC2626"; // Red
                break;
        }

        // 3. Beautiful HTML Template
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
                        <p style="margin: 5px 0 0 0; font-weight: bold; color: #333;">New Status: <span style="color: ${color}">${status.toUpperCase()}</span></p>
                    </div>

                    <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/my-orders" style="display: inline-block; background-color: #1C1C1C; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Order</a>
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

        // 4. Send Email to Customer
        const mailOptions = {
            from: `"The Bottle Stories" <${process.env.MAIL_USERNAME}>`,
            to: order.customer_email, // <--- Sending to the Customer
            subject: emailSubject,
            html: htmlTemplate
        };

        // Fire and forget (don't await, so the API responds fast)
        transporter.sendMail(mailOptions, (err, info) => {
            if(err) console.error("Status Update Email Failed:", err);
            else console.log("Status Update Email Sent:", info.response);
        });
        
        // 5. Respond to Admin
        res.json(order);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};


// @route   GET /api/orders/myorders
// @desc    Get logged in user's orders (Paginated & Filtered)
// @access  Private
// @route   GET /api/orders/myorders
exports.getMyOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const skip = (page - 1) * limit;

    const query = { user: req.user.id };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      // --- UPDATED POPULATE SECTION ---
      .populate({
        path: 'items',
        populate: [
          { 
            path: 'product',
            select: 'name images price'
          },
          { 
            path: 'selected_fragrances', // Populate the fragrances array
            select: 'name' // Only get the name
          }
        ]
      });
      // --------------------------------

    const total = await Order.countDocuments(query);
    const hasMore = skip + orders.length < total;

    res.json({
      data: orders,
      pagination: { page, limit, total, hasMore }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};