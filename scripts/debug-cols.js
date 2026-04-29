
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import pg from 'pg';
const { Pool } = pg;

async function checkColumns() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'applications'
        `);
        console.log('Columns in applications table:', res.rows.map(r => r.column_name).join(', '));

        const dataRes = await pool.query('SELECT preferred_combination FROM applications WHERE preferred_combination IS NOT NULL LIMIT 5');
        console.log('Recent Preferred Combinations:', dataRes.rows);

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await pool.end();
    }
}

checkColumns();
