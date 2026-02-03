
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import fs from 'fs';
import path from 'path';
import pg from 'pg';
const { Pool } = pg;
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log('Starting migration...');

    if (!process.env.DATABASE_URL) {
        console.error('Error: DATABASE_URL is not defined in .env');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const schemaPath = path.join(__dirname, '..', 'database-schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Applying schema...');
        await pool.query(schemaSql);

        console.log('Migration completed successfully!');

        const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('Tables in DB:', res.rows.map(r => r.table_name).join(', '));

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
