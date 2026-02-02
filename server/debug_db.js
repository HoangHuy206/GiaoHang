const mysql = require('mysql2/promise');

async function testConnection() {
    console.log("⏳ Đang thử kết nối đến TiDB...");
    
    const config = {
        host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
        port: 4000,
        user: 'vrQxVS7dzxo8oMs.root',
        password: 'pLUyi3X8j7FyLfuk', // Mật khẩu bạn cung cấp
        ssl: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: false
        }
    };

    try {
        // Thử kết nối không cần database trước
        const connection = await mysql.createConnection(config);
        console.log("✅ KẾT NỐI THÀNH CÔNG! (Mật khẩu đúng)");
        
        // Thử tạo database
        await connection.query(`CREATE DATABASE IF NOT EXISTS delivery_app`);
        console.log("✅ Đã kiểm tra/tạo database 'delivery_app'");
        
        await connection.end();
    } catch (error) {
        console.error("❌ KẾT NỐI THẤT BẠI:", error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.log("👉 Nguyên nhân: Sai tên đăng nhập hoặc Mật khẩu.");
        } else if (error.code === 'ENOTFOUND') {
            console.log("👉 Nguyên nhân: Sai địa chỉ Host (Gateway).");
        }
    }
}

testConnection();