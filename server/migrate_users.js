const pool = require('./db');

async function migrate() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to database.');

        // Add columns if they don't exist
        const columnsToAdd = [
            'ADD COLUMN IF NOT EXISTS email VARCHAR(255)',
            'ADD COLUMN IF NOT EXISTS cccd VARCHAR(20)',
            'ADD COLUMN IF NOT EXISTS gender VARCHAR(10)',
            'ADD COLUMN IF NOT EXISTS vehicle VARCHAR(255)'
            // Phone already exists in original schema but check just in case
        ];

        for (const col of columnsToAdd) {
            try {
                await connection.query(`ALTER TABLE users ${col}`);
                console.log(`Executed: ${col}`);
            } catch (e) {
                console.log(`Error or already exists: ${e.message}`);
            }
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
