
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Neon
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔌 Connected to database...');

        // 1. Alter password_hash to be NULLABLE
        console.log('🛠️  Altering users table: Making password_hash NULLABLE...');
        await client.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;`);

        // 2. Add google_id column if not exists
        console.log('🛠️  Altering users table: Adding google_id column...');
        await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='google_id') THEN 
          ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE; 
        END IF; 
      END $$;
    `);

        // 3. Add name column if not exists
        console.log('🛠️  Altering users table: Adding name column...');
        await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='name') THEN 
          ALTER TABLE users ADD COLUMN name VARCHAR(255); 
        END IF; 
      END $$;
    `);

        // 4. Add picture column if not exists
        console.log('🛠️  Altering users table: Adding picture column...');
        await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='picture') THEN 
          ALTER TABLE users ADD COLUMN picture TEXT; 
        END IF; 
      END $$;
    `);

        console.log('✅ Migration completed successfully!');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
