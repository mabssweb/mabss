
import pg from 'pg';
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL environment variable');
}

// Create a new pool using the connection string
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Helper for running queries
export const query = (text, params) => pool.query(text, params);
export { pool };
