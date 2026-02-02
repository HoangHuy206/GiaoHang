const mysql = require('mysql2/promise');
require('dotenv').config();

async function init() {
    console.log("🔄 Đang kết nối tới TiDB để khởi tạo database 'GiaoHangTanNoi'...");
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: false
        }
    });

    try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS 
${process.env.DB_NAME}
`);
        console.log(`✅ Đã tạo database '${process.env.DB_NAME}' thành công.`);
        await connection.end();
        
        console.log("🚀 Đang nạp dữ liệu mẫu (Seeding)...");
        const { exec } = require('child_process');
        exec('node server/seed.js', (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Lỗi Seed: ${error.message}`);
                return;
            }
            console.log(`✅ Kết quả Seed:
${stdout}`);
        });

    } catch (error) {
        console.error("❌ Lỗi khởi tạo:", error);
        await connection.end();
    }
}

init();