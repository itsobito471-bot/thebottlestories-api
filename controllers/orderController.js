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
      // item.selectedFragrances comes from frontend as an array of objects now:
      // [{ fragranceId: '...', size: '100ml', label: 'Bottle 1' }]

      const formattedFragrances = item.selectedFragrances?.map(f => ({
        fragrance: f.fragranceId,
        size: f.size,
        label: f.label
      })) || [];

      const newItem = new OrderItem({
        order: savedOrder._id,
        product: item._id,
        quantity: item.quantity,
        price_at_purchase: item.price,
        selected_fragrances: formattedFragrances, // Save the detailed structure
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
// exports.updateOrderStatus = async (req, res) => {
//   // 1. Extract all fields from the request body
//   const { status, trackingId, trackingUrl } = req.body;
//   const { id } = req.params;

//   console.log(`Updating Order ${id} to status: ${status}`);

//   // 2. Validation
//   const validStatuses = [
//     'pending', 'approved', 'crafting', 'packaging', 
//     'shipped', 'delivered', 'completed', 'cancelled', 'rejected'
//   ];

//   if (!validStatuses.includes(status)) {
//     return res.status(400).json({ 
//       msg: `Invalid status. Allowed: ${validStatuses.join(', ')}` 
//     });
//   }

//   try {
//     // 3. Prepare Update Data
//     // We explicitly check if tracking info exists in the body before adding it
//     const updateData = { 
//       status: status, 
//       updated_at: new Date() 
//     };

//     if (trackingId) updateData.trackingId = trackingId;
//     if (trackingUrl) updateData.trackingUrl = trackingUrl;

//     // 4. Find and Update in Database
//     const order = await Order.findByIdAndUpdate(
//       id,
//       { $set: updateData }, // $set ensures we only update specified fields
//       { new: true } // Returns the updated document
//     );

//     if (!order) {
//       return res.status(404).json({ msg: 'Order not found' });
//     }

//     // ---------------------------------------------------------
//     // 5. THE "MAGICAL" EMAIL CONTENT
//     // ---------------------------------------------------------
    
//     const gold = "#D4AF37"; 
//     const dark = "#1C1C1C";
//     const cream = "#FDFBF7";

//     let emailSubject = `A New Chapter for Order #${order._id.toString().slice(-6)}`;
//     let emailHeading = "The Story Continues";
//     let emailMessage = "Your order status has been updated.";
//     let icon = "✨"; 

//     // Dynamic Tracking Section (Initially Empty)
//     let trackingSection = "";

//     switch(status.toLowerCase()) {
//         case 'approved':
//             emailHeading = "The Journey Begins";
//             emailMessage = "Your request has been accepted. We are now preparing the canvas for your olfactory story.";
//             icon = "🖋️";
//             break;
//         case 'crafting':
//             emailHeading = "The Art of Blending";
//             emailMessage = "Our artisans are currently in the atelier, awakening the notes of your fragrance. Alchemy is in progress.";
//             icon = "🧪";
//             break;
//         case 'packaging':
//             emailHeading = "Wrapped in Mystery";
//             emailMessage = "We are adding the final touches of elegance to your hamper, ensuring it is as beautiful as the scent within.";
//             icon = "🎁";
//             break;
//         case 'shipped':
//             emailSubject = `Your Scent has Taken Flight 🕊️`;
//             emailHeading = "On the Winds";
//             emailMessage = "Your bottle has left our atelier and is traveling across the miles to find you.";
//             icon = "🕊️";

//             // --- BUILD TRACKING HTML SECTION (Uses data from the UPDATED order) ---
//             if (order.trackingId || order.trackingUrl) {
//                 trackingSection = `
//                   <div style="margin: 30px 0; padding: 20px; background-color: #ffffff; border: 1px dashed ${gold};">
//                     <p style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #999;">Tracking Details</p>
//                     ${order.trackingId ? `<p style="margin: 0 0 5px 0; font-family: 'Courier New', monospace; font-size: 14px; color: ${dark};">ID: <strong>${order.trackingId}</strong></p>` : ''}
//                     ${order.trackingUrl ? `<p style="margin: 10px 0 0 0;"><a href="${order.trackingUrl}" style="color: ${gold}; text-decoration: none; font-style: italic; font-family: 'Georgia', serif;">Follow the Journey &rarr;</a></p>` : ''}
//                   </div>
//                 `;
//             }
//             break;
//         case 'delivered':
//         case 'completed':
//             emailSubject = `The Story is Yours ✨`;
//             emailHeading = "A New Memory";
//             emailMessage = "Your bottle has arrived. Unbox the magic, wear the story, and let the memories begin.";
//             icon = "✨";
//             break;
//         case 'cancelled':
//         case 'rejected':
//             emailSubject = `Update on Order #${order._id.toString().slice(-6)}`;
//             emailHeading = "The Page Turns Back";
//             emailMessage = "Your order has been cancelled. If you wish to rewrite this story, please contact us.";
//             icon = "🍂";
//             break;
//         default:
//             break;
//     }

//     const htmlTemplate = `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <meta charset="utf-8">
//         <style>
//           @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
//         </style>
//       </head>
//       <body style="margin: 0; padding: 0; background-color: ${cream}; font-family: 'Georgia', 'Times New Roman', serif;">
//         <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${cream}; padding: 60px 0;">
//           <tr>
//             <td align="center">
//               <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; border: 1px solid #E5D5C0; background-color: #ffffff; padding: 10px;">
//                 <tr>
//                   <td>
//                     <div style="border: 1px solid ${gold}; padding: 40px; text-align: center;">
//                       <p style="text-transform: uppercase; letter-spacing: 2px; font-size: 10px; color: #999; margin-bottom: 10px;">Est. 2025</p>
//                       <h1 style="margin: 0 0 30px 0; font-family: 'Playfair Display', Georgia, serif; font-size: 32px; color: ${dark}; font-weight: 400; letter-spacing: 1px;">
//                         The Bottle Stories
//                       </h1>
//                       <div style="width: 40px; height: 1px; background-color: ${gold}; margin: 0 auto 30px auto;"></div>
//                       <div style="font-size: 32px; margin-bottom: 20px;">${icon}</div>
//                       <p style="color: ${gold}; text-transform: uppercase; letter-spacing: 2px; font-size: 12px; font-weight: bold; margin-bottom: 15px;">
//                         Status: ${status}
//                       </p>
//                       <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: ${dark}; margin: 0 0 20px 0; font-style: italic;">
//                         ${emailHeading}
//                       </h2>
//                       <p style="color: #555; font-size: 16px; line-height: 1.8; margin-bottom: ${trackingSection ? '10px' : '40px'}; max-width: 400px; margin-left: auto; margin-right: auto;">
//                         ${emailMessage}
//                       </p>
//                       ${trackingSection}
//                       <div style="background-color: ${cream}; padding: 25px; margin-bottom: 40px;">
//                         <table width="100%" border="0" cellspacing="0" cellpadding="0">
//                           <tr>
//                             <td align="left" style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888;">Order Reference</td>
//                             <td align="right" style="font-family: 'Courier New', monospace; font-size: 14px; color: ${dark};">#${order._id.toString().toUpperCase().slice(-8)}</td>
//                           </tr>
//                         </table>
//                       </div>
//                       <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/my-orders" style="display: inline-block; border: 1px solid ${dark}; color: ${dark}; text-decoration: none; padding: 12px 30px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; transition: all 0.3s ease;">
//                         View Your Collection
//                       </a>
//                     </div>
//                   </td>
//                 </tr>
//               </table>
//               <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px;">
//                 <tr>
//                   <td align="center" style="color: #999; font-size: 12px; font-family: sans-serif;">
//                     <p>&copy; ${new Date().getFullYear()} The Bottle Stories.<br>Every scent creates a memory.</p>
//                   </td>
//                 </tr>
//               </table>
//             </td>
//           </tr>
//         </table>
//       </body>
//       </html>
//     `;

//     // 6. Send Email
//     if (order.customer_email) {
//         const mailOptions = {
//             from: `"The Bottle Stories" <${process.env.MAIL_USERNAME}>`,
//             to: order.customer_email,
//             subject: emailSubject,
//             html: htmlTemplate
//         };

//         transporter.sendMail(mailOptions, (err, info) => {
//             if (err) console.error("❌ Status Email Failed:", err);
//             else console.log(`✅ Magic Sent: ${info.response}`);
//         });
//     }

//     res.json(order);

//   } catch (err) {
//     console.error('Update Status Error:', err.message);
//     if (err.kind === 'ObjectId') return res.status(404).json({ msg: 'Order not found' });
//     res.status(500).send('Server error');
//   }
// };

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