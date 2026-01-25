const pool = require('./db');

async function viewUsers() {
  try {
    const [rows] = await pool.query('SELECT id, username, role, full_name, phone, address FROM users');
    console.log('List of users in the database:');
    console.table(rows);
    process.exit(0);
  } catch (error) {
    console.error('Error fetching users:', error);
    process.exit(1);
  }
}

viewUsers();
