const pool = require('./db');

async function setup() {
    try {
        console.log('--- Cập nhật ngân hàng THẬT cho từng Shop cụ thể ---');
        
        // 1. Cập nhật cho Cơm bình dân
        await pool.query(
            "UPDATE shops SET bank_code = 'ICB', bank_account = '103882796067', bank_name = 'NGUYEN HAI QUAN' WHERE name LIKE '%Cơm bình dân%' OR name LIKE '%Com binh dan%'"
        );
        console.log('✅ Đã cập nhật: Cơm bình dân -> VietinBank (103882796067)');

        // 2. Cập nhật cho Tocotoc
        await pool.query(
            "UPDATE shops SET bank_code = 'ICB', bank_account = '101882796069', bank_name = 'NGUYEN HAI QUAN' WHERE name LIKE '%Tocotoc%' OR name LIKE '%Toco%'"
        );
        console.log('✅ Đã cập nhật: Tocotoc -> VietinBank (101882796069)');

        // 3. Cập nhật cho Cơm gà hầm và TẤT CẢ các shop còn lại (Mặc định)
        await pool.query(
            "UPDATE shops SET bank_code = 'MB', bank_account = '0396222614', bank_name = 'NGUYEN HAI QUAN' WHERE bank_account IS NULL OR (name NOT LIKE '%Cơm bình dân%' AND name NOT LIKE '%Tocotoc%')"
        );
        console.log('✅ Đã cập nhật: Cơm gà hầm & Các shop khác -> MB Bank (0396222614)');

        console.log('\n--- KIỂM TRA LẠI DANH SÁCH ---');
        const [rows] = await pool.query("SELECT name, bank_code, bank_account FROM shops");
        rows.forEach(r => {
            console.log(`- ${r.name.padEnd(25)} | ${r.bank_code.padEnd(5)} | ${r.bank_account}`);
        });

        console.log('\n🚀 TẤT CẢ ĐÃ SẴN SÀNG ĐỂ TEST THỰC TẾ TRÊN INTERNET!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi setup:', err);
        process.exit(1);
    }
}

setup();
