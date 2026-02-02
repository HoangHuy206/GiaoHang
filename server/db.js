const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: process.env.DB_PORT || 4000,
  user: process.env.DB_USER || 'vrQxVS7dzxo8oMs.root',
  password: process.env.DB_PASSWORD || 'ohqZ0nxLLd96XHPC',
  database: process.env.DB_NAME || 'GiaoHangTanNoi',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false
  }
});

module.exports = pool;