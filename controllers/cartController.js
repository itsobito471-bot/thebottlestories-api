const Cart = require('../models/Cart');

// @route   GET /api/cart
// @desc    Get user's cart
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    if (!cart) {
      // Create empty cart if none exists
      cart = await Cart.create({ user: req.user.id, items: [] });
    }
    res.json(cart.items);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/cart
// @desc    Update entire cart (Overwrite)
exports.updateCart = async (req, res) => {
  try {
    const { items } = req.body; // Expects array of items
    
    // Format items for saving (ensure product ID is used)
    const formattedItems = items.map(item => ({
      product: item._id || item.product,
      quantity: item.quantity,
      selected_fragrances: item.selectedFragrances || [],
      custom_message: item.customMessage || ''
    }));

    const cart = await Cart.findOneAndUpdate(
      { user: req.user.id },
      { items: formattedItems },
      { new: true, upsert: true }
    );

    res.json(cart.items);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

// @route   POST /api/cart/merge
// @desc    Merge local cart with DB cart on login
exports.mergeCart = async (req, res) => {
  try {
    const { localItems } = req.body;
    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    // Logic: Add local items to DB cart. 
    // If exact item exists, update quantity? Or just append?
    // Simple approach: Append local items to DB items
    
    const dbItems = cart.items;

    localItems.forEach(localItem => {
      // Check if this exact product + config exists in DB cart
      // (For simplicity, we just check Product ID here, but you can check variants)
      const existingItemIndex = dbItems.findIndex(
        dbItem => dbItem.product.toString() === localItem._id
      );

      if (existingItemIndex > -1) {
        // Update quantity if it exists
        dbItems[existingItemIndex].quantity += localItem.quantity;
      } else {
        // Add new item
        dbItems.push({
          product: localItem._id,
          quantity: localItem.quantity,
          selected_fragrances: localItem.selectedFragrances,
          custom_message: localItem.customMessage
        });
      }
    });

    cart.items = dbItems;
    await cart.save();
    
    // Return full populated cart
    const populatedCart = await Cart.findById(cart._id).populate('items.product');
    res.json(populatedCart.items);

  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};