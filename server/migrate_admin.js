const pool = require('./db');

async function migrate() {
    try {
        console.log("🔄 Updating users role enum...");
        await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('user', 'driver', 'shop', 'admin') NOT NULL");
        console.log("✅ Users role enum updated to include 'admin'.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
}

migrate();
