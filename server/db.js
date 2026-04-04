const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'delivery_app',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10, 
  idleTimeout: 60000, 
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Nếu dùng TiDB Cloud, SSL là bắt buộc. Nếu chạy local thì có thể tắt.
  ssl: process.env.DB_SSL === 'true' ? {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false
  } : null
});

module.exports = pool;
