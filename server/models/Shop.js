const mongoose = require('mongoose');
const shopSchema = new mongoose.Schema({
  originalId: { type: Number, unique: true },
  name: { type: String, required: true },
  user_id: { type: Number },
  image_url: String,
  address: String,
  lat: Number,
  lng: Number,
  bank_code: { type: String, default: 'MB' },
  bank_account: { type: String, default: '0396222614' },
  telegram_chat_id: String,
  average_prep_time: { type: Number, default: 15 }, // Thời gian chuẩn bị trung bình (phút)
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

shopSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Shop', shopSchema);
