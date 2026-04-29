
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function debug() {
    try {
        console.log('--- Database Diagnostic (ESM) ---');

        const appsCount = await pool.query('SELECT COUNT(*) FROM applications');
        console.log('Total Applications in DB:', appsCount.rows[0].count);

        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        console.log('Total Users in DB:', usersCount.rows[0].count);

        const joinTest = await pool.query(`
            SELECT a.id, a.user_id, u.id as matched_user_id, u.email
            FROM applications a
            LEFT JOIN users u ON a.user_id = u.id
            LIMIT 10
        `);
        console.log('Sample Joins (LEFT JOIN):', joinTest.rows);

        const orphans = await pool.query(`
            SELECT COUNT(*) FROM applications a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE u.id IS NULL
        `);
        console.log('Applications with NO matching user:', orphans.rows[0].count);

        // Check for specific IDs that might be in the frontend but not in DB
        // or check if there are any users at all
        const allUsers = await pool.query('SELECT id, email, role FROM users');
        console.log('All Users:', allUsers.rows);

    } catch (err) {
        console.error('Debug Error:', err);
    } finally {
        await pool.end();
    }
}

debug();
