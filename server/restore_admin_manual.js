const pool = require('./server/db');

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