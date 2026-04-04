const pool = require('./db');

async function debugShops() {
    try {
        console.log("--- DANH SÁCH TẤT CẢ CÁC QUÁN TRONG DATABASE ---");
        const [rows] = await pool.query(`
            SELECT s.id, s.name, s.is_active, s.user_id, u.username as owner 
            FROM shops s 
            LEFT JOIN users u ON s.user_id = u.id
            ORDER BY s.id DESC
        `);
        
        if (rows.length === 0) {
            console.log("Không có quán nào trong database.");
        } else {
            console.table(rows);
        }
        process.exit(0);
    } catch (err) {
        console.error("Lỗi:", err);
        process.exit(1);
    }
}

debugShops();
