const pool = require('./db');

async function migrate() {
    try {
        console.log("🔄 Adding telegram_chat_id column to users...");
        try {
            await pool.query("ALTER TABLE users ADD COLUMN telegram_chat_id VARCHAR(50)");
        } catch (e) {
            console.log("⚠️ Column might already exist, skipping...");
        }

        console.log("🔄 Assigning Admin role to ID 5807941249...");
        // Cập nhật telegram_chat_id cho user liên quan (dựa trên shops cũ hoặc gán thủ công)
        // Ở đây tôi sẽ tìm user đang có id này trong shop 1 và gán vào user đó
        const [shops] = await pool.query("SELECT user_id FROM shops WHERE telegram_chat_id = '5807941249' LIMIT 1");
        if (shops.length > 0) {
            const userId = shops[0].user_id;
            await pool.query("UPDATE users SET role = 'admin', telegram_chat_id = '5807941249' WHERE id = ?", [userId]);
            console.log(`✅ User #${userId} is now ADMIN with Telegram ID 5807941249.`);
        } else {
            console.log("⚠️ No user found with this Telegram ID in shops table.");
        }

        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
}

migrate();
