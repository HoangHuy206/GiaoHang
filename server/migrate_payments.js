const pool = require('./db');

async function migrate() {
  try {
    console.log('Adding bank columns to shops table...');
    await pool.execute('ALTER TABLE shops ADD COLUMN bank_code VARCHAR(50)');
    await pool.execute('ALTER TABLE shops ADD COLUMN bank_account VARCHAR(50)');
    await pool.execute('ALTER TABLE shops ADD COLUMN bank_name VARCHAR(255)');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Columns already exist in shops table.');
    } else {
      throw err;
    }
  }

  try {
    console.log('Adding payment columns to orders table...');
    await pool.execute('ALTER TABLE orders ADD COLUMN payment_status ENUM(\'unpaid\', \'paid\', \'refunded\') DEFAULT \'unpaid\'');
    await pool.execute('ALTER TABLE orders ADD COLUMN paid_at TIMESTAMP NULL');
    await pool.execute('ALTER TABLE orders ADD COLUMN customer_bank_code VARCHAR(50)');
    await pool.execute('ALTER TABLE orders ADD COLUMN customer_bank_account VARCHAR(50)');
    await pool.execute('ALTER TABLE orders ADD COLUMN customer_bank_name VARCHAR(255)');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Columns already exist in orders table.');
    } else {
      throw err;
    }
  }

  console.log('Migration completed.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
