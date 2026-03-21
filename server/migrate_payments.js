const pool = require('./db');

async function addColumnIfNotExists(table, column, definition) {
  try {
    await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`✅ Đã thêm cột [${column}] vào bảng [${table}]`);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_COLUMN_NAME') {
      console.log(`ℹ️ Cột [${column}] đã tồn tại trong bảng [${table}], bỏ qua.`);
    } else {
      console.error(`❌ Lỗi khi thêm cột [${column}]:`, err.message);
    }
  }
}

async function migrate() {
  try {
    console.log('--- Bắt đầu nâng cấp cấu trúc Database ---');

    // Nâng cấp bảng shops
    await addColumnIfNotExists('shops', 'bank_code', 'VARCHAR(50)');
    await addColumnIfNotExists('shops', 'bank_account', 'VARCHAR(50)');
    await addColumnIfNotExists('shops', 'bank_name', 'VARCHAR(255)');

    // Nâng cấp bảng orders
    await addColumnIfNotExists('orders', 'payment_status', "ENUM('unpaid', 'paid', 'refunded') DEFAULT 'unpaid'");
    await addColumnIfNotExists('orders', 'paid_at', 'TIMESTAMP NULL');
    await addColumnIfNotExists('orders', 'customer_bank_code', 'VARCHAR(50)');
    await addColumnIfNotExists('orders', 'customer_bank_account', 'VARCHAR(50)');
    await addColumnIfNotExists('orders', 'customer_bank_name', 'VARCHAR(255)');

    console.log('--- Hoàn thành nâng cấp! ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration thất bại:', err);
    process.exit(1);
  }
}

migrate();
