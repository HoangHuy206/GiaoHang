const mongoose = require('mongoose');
const orderItemSchema = new mongoose.Schema({
  originalId: Number,
  product_id: Number,
  quantity: Number,
  price: Number
});
const orderSchema = new mongoose.Schema({
  originalId: { type: Number, unique: true },
  user_id: Number,
  shop_id: Number,
  driver_id: Number,
  status: { type: String, default: 'pending' },
  payment_status: { type: String, default: 'unpaid' },
  total_price: Number,
  items_price: Number,
  delivery_fee: Number,
  discount: Number,
  delivery_address: String,
  delivery_lat: Number,
  delivery_lng: Number,
  pickup_address: String,
  customer_bank_code: String,
  customer_bank_account: String,
  customer_bank_name: String,
  refund_notified: Boolean,
  paid_at: Date,
  items: [orderItemSchema],
  created_at: Date
}, { timestamps: true });

orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
