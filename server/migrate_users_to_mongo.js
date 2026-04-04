const pool = require('./db');
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const migrateUsers = async () => {
  try {
    // 1. Kết nối MongoDB
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not defined in .env");
    await mongoose.connect(uri);
    console.log('🍃 Đã kết nối MongoDB.');

    // 2. Lấy dữ liệu từ TiDB (MySQL)
    console.log('📥 Đang lấy dữ liệu từ TiDB...');
    const [users] = await pool.query('SELECT * FROM users');
    console.log(`✅ Đã tìm thấy ${users.length} người dùng.`);

    // 3. Chuyển dữ liệu sang MongoDB
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Sử dụng upsert (update if exists, insert if not) dựa trên username
        await User.findOneAndUpdate(
          { username: user.username },
          {
            originalId: user.id,
            username: user.username,
            password: user.password,
            role: user.role,
            full_name: user.full_name,
            avatar_url: user.avatar_url,
            phone: user.phone,
            email: user.email,
            cccd: user.cccd,
            gender: user.gender,
            vehicle: user.vehicle,
            address: user.address,
            created_at: user.created_at
          },
          { upsert: true, new: true }
        );
        successCount++;
        if (successCount % 10 === 0) console.log(`🚀 Đã chuyển ${successCount}/${users.length}...`);
      } catch (err) {
        console.error(`❌ Lỗi khi chuyển user ${user.username}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n--- KẾT QUẢ DI CƯ ---');
    console.log(`✅ Thành công: ${successCount}`);
    console.log(`❌ Thất bại: ${errorCount}`);
    console.log('---------------------');

  } catch (err) {
    console.error('💥 Lỗi nghiêm trọng trong quá trình di cư:', err.message);
  } finally {
    // Đóng kết nối
    await mongoose.connection.close();
    console.log('🔌 Đã đóng kết nối MongoDB.');
    process.exit(0);
  }
};

migrateUsers();
