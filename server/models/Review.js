const mongoose = require('mongoose');
const reviewSchema = new mongoose.Schema({
  originalId: { type: Number, unique: true },
  order_id: Number,
  user_id: Number,
  shop_id: Number,
  rating: Number,
  comment: String,
  created_at: Date
}, { timestamps: true });

reviewSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
