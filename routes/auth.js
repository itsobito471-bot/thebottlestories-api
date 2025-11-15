// routes/auth.js

const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const passport = require('passport');
const { googleCallback } = require('../controllers/authController');

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerUser);

// @route   POST api/auth/login
// @desc    Authenticate user & get token (Login)
// @access  Public
router.post('/login', loginUser);


// @route   GET /api/auth/google
// @desc    Start Google OAuth flow
// @access  Public
router.get(
  '/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'], // What we want from Google
    session: false // We are using JWT, not sessions
  })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get(
  '/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login', // Redirect to login on failure
    session: false 
  }),
  googleCallback // Our controller function
);


module.exports = router;