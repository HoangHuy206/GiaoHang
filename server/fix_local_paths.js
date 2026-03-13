const pool = require('./db');

async function fixPaths() {
    try {
        console.log("🔄 Đang cập nhật đường dẫn ảnh thực tế từ thư mục uploads...");

        const shopImageMapping = {
            'Phở gà Anh Thư': '/uploads/comngon.jpg',
            'Lotteria - Vincom Smart City': '/uploads/lotte.jpg',
            'Cơm bình dân': '/uploads/comtho.jpg',
            'Cơm gà hầm': '/uploads/gaham.jpg',
            'Tocotoco': '/uploads/toco.jpg',
            'Bún chấm': '/uploads/buncham.jpg',
            'Mixue': '/uploads/mixue.jpg'
        };

        for (const [name, path] of Object.entries(shopImageMapping)) {
            await pool.query("UPDATE shops SET image_url = ? WHERE name = ?", [path, name]);
        }

        // Với các sản phẩm, nếu đang là link demo thì chuyển về ảnh mặc định trong uploads để bạn tự thay sau
        await pool.query("UPDATE products SET image_url = '/uploads/anhdaidienmacdinh.jpg' WHERE image_url LIKE '%loremflickr.com%'");

        console.log("✅ Đã cập nhật xong đường dẫn ảnh cục bộ.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Lỗi:", err);
        process.exit(1);
    }
}

fixPaths();
