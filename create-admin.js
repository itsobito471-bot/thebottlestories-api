// create-admin.js
const mongoose = require('mongoose');
const AdminUser = require('./models/AdminUser');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const createAdmin = async () => {
  await connectDB();

  const admin = new AdminUser({
    email: 'admin@example.com',
    full_name: 'Admin User',
    password_hash: 'mypassword123', // <-- CHANGE THIS!
  });

  try {
    await admin.save();
    console.log('Admin user created successfully!');
  } catch (err) {
    console.error('Error creating admin:', err.message);
  }
  
  mongoose.connection.close();
};

createAdmin();