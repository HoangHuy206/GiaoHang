const pool = require('./db');

async function restore() {
    try {
        console.log("🔄 Restoring demo images...");

        const shopImages = {
            'Phở gà Anh Thư': 'https://loremflickr.com/640/480/noodle,restaurant?lock=153',
            'Lotteria - Vincom Smart City': 'https://loremflickr.com/640/480/fastfood?lock=250',
            'Cơm bình dân': 'https://loremflickr.com/640/480/rice,restaurant?lock=350',
            'Cơm gà hầm': 'https://loremflickr.com/640/480/chicken,restaurant?lock=450',
            'Tocotoco': 'https://loremflickr.com/640/480/drink,dessert?lock=550',
            'Bún chấm': 'https://loremflickr.com/640/480/noodle,restaurant?lock=650',
            'Mixue': 'https://loremflickr.com/640/480/drink,dessert?lock=750'
        };

        for (const [name, img] of Object.entries(shopImages)) {
            await pool.query("UPDATE shops SET image_url = ? WHERE name = ?", [img, name]);
        }

        // Restore some products too
        await pool.query("UPDATE products SET image_url = CONCAT('https://loremflickr.com/320/240/food?lock=', id) WHERE image_url = 'anhdaidienmacdinh.jpg' OR image_url LIKE '%/uploads/%'");

        console.log("✅ Demo images restored.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error restoring:", err);
        process.exit(1);
    }
}

restore();
