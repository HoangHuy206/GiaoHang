const pool = require('./db');

async function activateAllShops() {
    try {
        const [result] = await pool.query('UPDATE shops SET is_active = 1');
        console.log(`Đã kích hoạt lại các quán. Số lượng thay đổi: ${result.affectedRows}`);
        process.exit(0);
    } catch (err) {
        console.error("Lỗi kích hoạt quán:", err);
        process.exit(1);
    }
}

activateAllShops();
