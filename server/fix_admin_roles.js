const pool = require('./db');

async function adjustRoles() {
    try {
        console.log("🔄 Đang điều chỉnh vai trò người dùng...");

        // 1. Đưa shopgaham về lại vai trò shop
        await pool.query("UPDATE users SET role = 'shop' WHERE username = 'shopgaham'");
        console.log("✅ Đã chuyển 'shopgaham' về vai trò Shop.");

        // 2. Tạo tài khoản Admin mới (hoặc cập nhật nếu đã tồn tại)
        const [exists] = await pool.query("SELECT id FROM users WHERE username = 'admin_tannoi'");
        
        if (exists.length > 0) {
            await pool.query(
                "UPDATE users SET role = 'admin', telegram_chat_id = '5807941249' WHERE username = 'admin_tannoi'"
            );
            console.log("✅ Đã cập nhật tài khoản 'admin_tannoi' thành Admin.");
        } else {
            await pool.query(
                "INSERT INTO users (username, password, role, full_name, telegram_chat_id) VALUES (?, ?, 'admin', ?, ?)",
                ['admin_tannoi', 'admin@2026', 'Quản Trị Viên Tổng', '5807941249']
            );
            console.log("✅ Đã tạo mới tài khoản Admin: admin_tannoi / admin@2026");
        }

        process.exit(0);
    } catch (err) {
        console.error("❌ Lỗi:", err);
        process.exit(1);
    }
}

adjustRoles();
