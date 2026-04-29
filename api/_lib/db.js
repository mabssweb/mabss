
import pg from 'pg';
const { Pool } = pg;

// Lazy initialization holder
let pool = null;

function getPool() {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            console.error('DB ERROR: DATABASE_URL is missing');
            throw new Error('DATABASE_URL environment variable is not set');
        }
        try {
            console.log('Initializing DB Pool with URL length:', process.env.DATABASE_URL.length);
            pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: {
                    rejectUnauthorized: false
                }
            });
            // Attach error handler to pool to catch background errors
            pool.on('error', (err, client) => {
                console.error('Unexpected error on idle client', err);
            });
        } catch (err) {
            console.error('Failed to initialize pool:', err);
            throw err;
        }
    }
    return pool;
}

// Safe query wrapper that initializes pool on first request
export const query = async (text, params) => {
    const p = getPool();
    return p.query(text, params);
};

// Export pool getter if needed for direct access
export { getPool as pool };

