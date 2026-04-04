const pool = require('./db');
const mongoose = require('mongoose');
const User = require('./models/User');
const Shop = require('./models/Shop');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Transaction = require('./models/Transaction');
const Review = require('./models/Review');
require('dotenv').config();

const migrateAll = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://huyhoangzz:XCTZiAnCCytQeu5b@cluster0.trwjvms.mongodb.net/GiaoHang?appName=Cluster0';
    await mongoose.connect(uri);
    console.log('🍃 MongoDB Connected.');

    // --- 1. Migrate Shops ---
    console.log('📥 Migrating Shops...');
    const [shops] = await pool.query('SELECT * FROM shops');
    for (const s of shops) {
      await Shop.findOneAndUpdate({ originalId: s.id }, {
        originalId: s.id, name: s.name, user_id: s.user_id, image_url: s.image_url,
        address: s.address, lat: s.lat, lng: s.lng, bank_code: s.bank_code,
        bank_account: s.bank_account, telegram_chat_id: s.telegram_chat_id, is_active: !!s.is_active
      }, { upsert: true });
    }
    console.log(`✅ Shops: ${shops.length}`);

    // --- 2. Migrate Products ---
    console.log('📥 Migrating Products...');
    const [products] = await pool.query('SELECT * FROM products');
    for (const p of products) {
      await Product.findOneAndUpdate({ originalId: p.id }, {
        originalId: p.id, shop_id: p.shop_id, name: p.name,
        product_code: p.product_code, price: p.price, image_url: p.image_url
      }, { upsert: true });
    }
    console.log(`✅ Products: ${products.length}`);

    // --- 3. Migrate Orders & Order Items ---
    console.log('📥 Migrating Orders...');
    const [orders] = await pool.query('SELECT * FROM orders');
    const [orderItems] = await pool.query('SELECT * FROM order_items');
    
    for (const o of orders) {
      const items = orderItems.filter(item => item.order_id === o.id).map(item => ({
        originalId: item.id, product_id: item.product_id, quantity: item.quantity, price: item.price
      }));
      
      await Order.findOneAndUpdate({ originalId: o.id }, {
        originalId: o.id, user_id: o.user_id, shop_id: o.shop_id, driver_id: o.driver_id,
        status: o.status, payment_status: o.payment_status, total_price: o.total_price,
        items_price: o.items_price, delivery_fee: o.delivery_fee, discount: o.discount,
        delivery_address: o.delivery_address, delivery_lat: o.delivery_lat, delivery_lng: o.delivery_lng,
        pickup_address: o.pickup_address, customer_bank_code: o.customer_bank_code,
        customer_bank_account: o.customer_bank_account, customer_bank_name: o.customer_bank_name,
        refund_notified: !!o.refund_notified, paid_at: o.paid_at, created_at: o.created_at,
        items: items
      }, { upsert: true });
    }
    console.log(`✅ Orders: ${orders.length}`);

    // --- 4. Migrate Transactions ---
    console.log('📥 Migrating Transactions...');
    const [transactions] = await pool.query('SELECT * FROM transactions');
    for (const t of transactions) {
      await Transaction.findOneAndUpdate({ originalId: t.id }, {
        originalId: t.id, order_code: t.order_code, amount: t.amount,
        content: t.content, gateway: t.gateway, created_at: t.created_at
      }, { upsert: true });
    }
    console.log(`✅ Transactions: ${transactions.length}`);

    // --- 5. Migrate Reviews ---
    console.log('📥 Migrating Reviews...');
    const [reviews] = await pool.query('SELECT * FROM reviews');
    for (const r of reviews) {
      await Review.findOneAndUpdate({ originalId: r.id }, {
        originalId: r.id, order_id: r.order_id, user_id: r.user_id,
        shop_id: r.shop_id, rating: r.rating, comment: r.comment, created_at: r.created_at
      }, { upsert: true });
    }
    console.log(`✅ Reviews: ${reviews.length}`);

    console.log('\n🌟 ALL TABLES MIGRATED SUCCESSFULLY!');

  } catch (err) {
    console.error('💥 Migration Error:', err.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

migrateAll();
