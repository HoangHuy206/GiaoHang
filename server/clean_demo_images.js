const pool = require('./db');

async function cleanImages() {
    try {
        console.log("🔄 Đang dọn dẹp ảnh demo trong database...");
        
        // Cập nhật các shop đang dùng ảnh demo về ảnh mặc định
        await pool.query("UPDATE shops SET image_url = 'anhdaidienmacdinh.jpg' WHERE image_url LIKE '%loremflickr.com%'");
        
        // Cập nhật các sản phẩm đang dùng ảnh demo (nếu có)
        await pool.query("UPDATE products SET image_url = 'anhdaidienmacdinh.jpg' WHERE image_url LIKE '%loremflickr.com%'");

        console.log("✅ Đã xóa bỏ toàn bộ đường dẫn ảnh demo. Hệ thống sẽ sử dụng ảnh thực tế.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Lỗi:", err);
        process.exit(1);
    }
}

cleanImages();
