// middleware/upload.js

const multer = require('multer');
const path = require('path');
const fs = require('fs'); // <-- 1. Import the File System module

// --- 2. Define Upload Directory and Ensure It Exists ---
// This creates a path to the 'uploads' folder in your project's root
const uploadDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
  // If the 'uploads' directory doesn't exist, create it
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Created directory: ${uploadDir}`);
}
// ----------------------------------------------------

// 1. Configure Multer
const storage = multer.diskStorage({
  destination(req, file, cb) {
    // 3. Use the 'uploadDir' variable
    cb(null, uploadDir); 
  },
  filename(req, file, cb) {
    // Create a unique filename: fieldname-timestamp.ext
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// 2. File Filter
function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Images only! (jpg, jpeg, png, gif)'));
  }
}

// 3. Initialize Multer
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// 4. Export the middleware
module.exports = upload.array('images', 10);