const pool = require('./db');

async function checkFavorites() {
  try {
    const [rows] = await pool.query('SELECT * FROM favorites');
    console.log('--- ALL FAVORITES ---');
    console.table(rows);
    await pool.end();
  } catch (err) {
    console.error(err);
  }
}
checkFavorites();
