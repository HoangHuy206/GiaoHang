const pool = require('./db');

async function syncWithAssets() {
    try {
        console.log("🔄 Đồng bộ database với thư mục ảnh anhND...");

        const mapping = {
            'Phở gà Anh Thư': 'comngon.jpg',
            'Lotteria - Vincom Smart City': 'lotte.jpg',
            'Cơm bình dân': 'comtho.jpg',
            'Cơm gà hầm': 'gaham.jpg',
            'Tocotoco': 'toco.jpg',
            'Bún chấm': 'buncham.jpg',
            'Mixue': 'mixue.jpg'
        };

        for (const [name, fileName] of Object.entries(mapping)) {
            const imageUrl = `/uploads/${fileName}`;
            await pool.query("UPDATE shops SET image_url = ? WHERE name = ?", [imageUrl, name]);
        }

        console.log("✅ Đã đồng bộ tên file ảnh.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

syncWithAssets();
