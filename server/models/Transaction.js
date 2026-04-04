const mongoose = require('mongoose');
const transactionSchema = new mongoose.Schema({
  originalId: { type: Number, unique: true },
  order_code: String,
  amount: Number,
  content: String,
  gateway: String,
  created_at: Date
}, { timestamps: true });

transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
