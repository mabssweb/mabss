
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
    const client = await pool.connect();
    try {
        const res = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);

        const hasGoogleId = res.rows.some(r => r.column_name === 'google_id');
        const passwordNullable = res.rows.find(r => r.column_name === 'password_hash')?.is_nullable === 'YES';

        console.log('RESULTS_START');
        console.log(`Has google_id: ${hasGoogleId}`);
        console.log(`Password Nullable: ${passwordNullable}`);
        console.log('RESULTS_END');

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        client.release();
        pool.end();
    }
}

checkSchema();
