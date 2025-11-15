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

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // --- NEW CHECK ---
    // Check if user has a password. If not, they signed up with OAuth.
    if (!user.password) {
      return res.status(400).json({ 
        message: 'You registered using a social account. Please sign in with Google or Facebook.' 
      });
    }
    // --- END NEW CHECK ---

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = { user: { id: user.id } };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5d' },
      (err, token) => {
        if (err) throw err;
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

// --- ADD THIS NEW FUNCTION ---
// @desc    Handle Google OAuth callback
// @route   GET /api/auth/google/callback
exports.googleCallback = (req, res) => {
  // This function runs after Passport successfully authenticates
  // The user object is attached to req.user by Passport
  
  const payload = {
    user: {
      id: req.user.id,
    },
  };

  jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: '5d' },
    (err, token) => {
      if (err) throw err;
      
      // Send token and user data back to the frontend via URL parameters
      const userParam = encodeURIComponent(JSON.stringify({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
      }));
      
      // Redirect to a dedicated callback page on your frontend
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${userParam}`);
    }
  );
};

