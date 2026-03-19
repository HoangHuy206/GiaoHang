const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false }
});

async function restoreAdmin() {
  try {
    await pool.query("INSERT IGNORE INTO users (username, password, role, full_name, telegram_chat_id) VALUES ('admin_tannoi', 'admin@2026', 'admin', 'Quản Trị Viên Tổng', '5807941249')");
    console.log('✅ Admin account restored successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error restoring admin:', err);
    process.exit(1);
  }
}

restoreAdmin();