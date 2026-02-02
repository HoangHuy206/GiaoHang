const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'giaohangtannoi',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false
    }
});

async function migrate() {
    try {
        const connection = await pool.getConnection();
        console.log("Connected to database...");

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_code VARCHAR(50) NOT NULL, -- The DHxxxxxx code
                amount DECIMAL(15, 2) NOT NULL,
                content TEXT,
                bank_account VARCHAR(50),
                transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                gateway VARCHAR(50) DEFAULT 'unknown', -- e.g., 'casso', 'sepay'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (order_code)
            );
        `;

        await connection.query(createTableQuery);
        console.log("Table 'transactions' created or already exists.");

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();