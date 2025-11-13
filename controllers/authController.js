// controllers/authController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
// @route   POST /api/auth/register
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // 1. Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // 2. Create new user instance
    user = new User({
      name,
      email,
      password,
    });

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 4. Save user to database
    await user.save();

    // 5. Return success (we don't log them in, we make them log in after)
    res.status(201).json({ message: 'User registered successfully. Please log in.' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 3. Create JWT Payload
    const payload = {
      user: {
        id: user.id, // This is the user's MongoDB _id
      },
    };

    // 4. Sign the token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5d' }, // Token expires in 5 days
      (err, token) => {
        if (err) throw err;
        // 5. Send token and user info back (except password)
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};