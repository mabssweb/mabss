
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function verify() {
    console.log('Testing connection to:', process.env.DATABASE_URL ? 'URL Found' : 'URL MISSING');
    if (!process.env.DATABASE_URL) {
        console.error('ERROR: DATABASE_URL is not set in .env');
        process.exit(1);
    }

    try {
        const client = await pool.connect();
        console.log('Successfully connected to database!');
        const res = await client.query('SELECT NOW()');
        console.log('Database time:', res.rows[0].now);
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('CONNECTION ERROR:', err.message);
        console.error('ERROR DETAIL:', err);
        process.exit(1);
    }
}

verify();
