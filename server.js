const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const passport = require('passport'); // <-- 1. FIX: Import the 'passport' library
require('dotenv').config();

const app = express();

const allowedOrigins = [
  'http://localhost:3000',      // Your Next.js dev environment
  process.env.FRONTEND_URL    // Your production frontend
];

const corsOptions = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('This domain is not allowed by CORS'));
    }
  },
  credentials: true
};

// Connect to Database
connectDB();

// --- Initialize Passport ---
app.use(passport.initialize()); // <-- 2. This now works
require('./config/passport')(passport); // <-- 3. This is the connection. It passes the library into your config file.

// Init Middleware
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// This makes the 'uploads' folder public
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Define Routes
app.use('/api/admin-auth', require('./routes/adminAuth'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/cart', require('./routes/cart')); // <-- ADD THIS
app.use('/api/enquiries', require('./routes/enquiry')); // <-- ADD THIS
app.use('/api/tags', require('./routes/tags')); // <-- ADD THIS

// Basic route
app.get('/', (req, res) => res.send('API Running'));

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));