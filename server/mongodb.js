const mongoose = require('mongoose');
require('dotenv').config();

const connectMongoDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in .env');
    }
    await mongoose.connect(uri);
    console.log('🍃 MongoDB Connected Successfully!');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    // Không thoát process ở đây để tránh ảnh hưởng đến database chính (TiDB)
  }
};

module.exports = connectMongoDB;
