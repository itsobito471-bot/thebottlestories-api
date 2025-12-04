const User = require('../models/User');
const Address = require('../models/Address');


// @desc    Get User Profile & Addresses
// @route   GET /api/user/profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    const addresses = await Address.find({ user: req.user.id }).sort({ isDefault: -1, createdAt: -1 });
    res.json({ user, addresses });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update User Info (Phone/DOB/Name)
// @route   PUT /api/user/profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, phone, dob } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { name, phone, dob }, 
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Add New Address
// @route   POST /api/user/address
exports.addAddress = async (req, res) => {
  try {
    const address = new Address({ ...req.body, user: req.user.id });
    await address.save();
    res.json(address);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete Address
// @route   DELETE /api/user/address/:id
exports.deleteAddress = async (req, res) => {
  try {
    await Address.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ message: 'Address removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};


// @desc    Upload Profile Picture
// @route   POST /api/user/avatar
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Construct URL (Adjust BASE_URL based on your environment)
    const baseUrl = process.env.BASE_URL || 'http://localhost:8000';
    const imagePath = `${baseUrl}/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: imagePath },
      { new: true } // Return updated user
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
};


exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', filterBirthday = 'false' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let pipeline = [];

    // 1. Match Users (Search)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // 2. Birthday Logic (Calculated Fields)
    if (filterBirthday === 'true') {
      const today = new Date();
      pipeline.push(
        { $match: { dob: { $exists: true, $ne: null } } },
        {
          $addFields: {
            currentYearBirthday: {
              $dateFromParts: {
                year: { $year: today },
                month: { $month: "$dob" },
                day: { $dayOfMonth: "$dob" }
              }
            }
          }
        },
        {
          $addFields: {
            nextBirthday: {
              $cond: {
                if: { $lt: ["$currentYearBirthday", today] },
                then: {
                  $dateFromParts: {
                    year: { $add: [{ $year: today }, 1] },
                    month: { $month: "$dob" },
                    day: { $dayOfMonth: "$dob" }
                  }
                },
                else: "$currentYearBirthday"
              }
            }
          }
        },
        {
          $addFields: {
            diffInMs: { $subtract: ["$nextBirthday", today] }
          }
        },
        {
          $addFields: {
            daysUntilBirthday: { $divide: ["$diffInMs", 1000 * 60 * 60 * 24] }
          }
        },
        {
          $match: {
            daysUntilBirthday: { $gte: 0, $lte: 10 }
          }
        },
        { $sort: { daysUntilBirthday: 1 } }
      );
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    // --- NEW: FETCH ADDRESSES ($lookup) ---
    // This joins the 'addresses' collection where addresses.user == users._id
    pipeline.push({
      $lookup: {
        from: 'addresses',       // The actual name of the collection in MongoDB (usually lowercase plural)
        localField: '_id',       // User ID in User table
        foreignField: 'user',    // User ID in Address table
        as: 'addressDetails'     // The array name to put results in
      }
    });

    // 3. Pagination Facet
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: parseInt(limit) }]
      }
    });

    const result = await User.aggregate(pipeline);
    
    const users = result[0].data;
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

    res.status(200).json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        hasMore: skip + users.length < total
      }
    });

  } catch (error) {
    console.error("User fetch error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};