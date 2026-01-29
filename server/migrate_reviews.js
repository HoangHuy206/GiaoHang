const pool = require('./db');

async function migrate() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to database.');

        // Create reviews table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                driver_id INT NOT NULL,
                user_id INT NOT NULL,
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (driver_id) REFERENCES users(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE KEY unique_order_review (order_id)
            )
        `);
        console.log('Reviews table created or already exists.');

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
