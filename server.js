const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path'); // <-- 1. ADD THIS LINE
require('dotenv').config();

const app = express();

const allowedOrigins = [
  'http://localhost:3000',      // Your Next.js dev environment
  process.env.FRONTEND_URL    // Your production frontend
];

const corsOptions = {
  origin: function (origin, callback) {
    // Check if the request's origin is in our allowed list
    // 'origin' will be undefined for server-to-server requests or Postman
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('This domain is not allowed by CORS'));
    }
  },
  credentials: true // This is essential for cookies
};

// Connect to Database
connectDB();

// Init Middleware
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// --- 2. ADD THIS LINE ---
// This makes the 'uploads' folder public.
// Any request to /uploads/filename.jpg will serve the file.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// ------------------------

// Define Routes
app.use('/api/admin-auth', require('./routes/adminAuth'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin')); // This now includes your /upload route
app.use('/api/products', require('./routes/products'));

// ... other routes

// Basic route
app.get('/', (req, res) => res.send('API Running'));

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));