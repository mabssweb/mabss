
import pg from 'pg';
const { Pool } = pg;

// Lazy initialization holder
let pool = null;

function getPool() {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL environment variable is not set');
        }
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });
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

