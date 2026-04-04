const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({
  originalId: { type: Number, unique: true },
  shop_id: { type: Number },
  name: { type: String, required: true },
  product_code: String,
  price: Number,
  image_url: String
}, { timestamps: true });

productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
