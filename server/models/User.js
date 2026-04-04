const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  originalId: { type: Number, unique: true }, // ID từ TiDB/MySQL
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'driver', 'shop', 'admin'], default: 'user' },
  full_name: String,
  avatar_url: String,
  phone: String,
  email: String,
  cccd: String,
  gender: String,
  vehicle: String,
  address: String,
  addresses: [{
    label: String, // Ví dụ: 'Nhà', 'Công ty', 'Bạn gái'
    address: String,
    lat: Number,
    lng: Number,
    is_default: { type: Boolean, default: false }
  }],
  google_id: String,
  auth_provider: { type: String, default: 'local' }, // 'local' hoặc 'google'
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
