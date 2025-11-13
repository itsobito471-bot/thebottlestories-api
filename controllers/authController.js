const AdminUser = require('../models/AdminUser');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log(email, password,'login attempt');
    const user = await AdminUser.findOne({ email });
    console.log(user);
    if (!user) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ msg: 'Invalid credentials' });
    }

    const payload = {
      user: {
        id: user.id,
        name: user.full_name,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3h' });

    // --- THIS IS THE CHANGE ---
    // REMOVE res.cookie(...)
    // SEND the token in the response
    res.json({
      token,
      user: {
        _id: user.id,
        name: user.full_name,
        email: user.email,
      }
    });
    // --------------------------

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};