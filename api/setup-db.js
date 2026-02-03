
import * as db from '../_lib/db';

export default async function handler(req, res) {
    try {
        console.log('Running Database Migration...');

        const sql = `
            -- Enable UUID extension
            CREATE EXTENSION IF NOT EXISTS "pgcrypto";

            CREATE TABLE IF NOT EXISTS news (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                summary TEXT NOT NULL,
                content TEXT NOT NULL,
                featured_image_url TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at DESC);

            -- Users Table
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT, -- Nullable for Google Auth
                google_id VARCHAR(255) UNIQUE,
                avatar_url TEXT,
                role VARCHAR(50) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Applications Table
            CREATE TABLE IF NOT EXISTS applications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                application_number VARCHAR(50) UNIQUE NOT NULL,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'accepted', 'rejected', 'interview')),
                surname VARCHAR(100) NOT NULL,
                other_names VARCHAR(100) NOT NULL,
                lin VARCHAR(50) NOT NULL,
                dob DATE NOT NULL,
                sex VARCHAR(10) NOT NULL,
                class_applying VARCHAR(10) NOT NULL,
                age INTEGER NOT NULL,
                former_school VARCHAR(255) NOT NULL,
                birth_country VARCHAR(100) NOT NULL,
                birth_district VARCHAR(100) NOT NULL,
                birth_county VARCHAR(100) NOT NULL,
                birth_parish VARCHAR(100) NOT NULL,
                birth_village VARCHAR(100) NOT NULL,
                admission_mode VARCHAR(50) NOT NULL,
                parent_category VARCHAR(50) NOT NULL,
                day_status VARCHAR(50) NOT NULL,
                boarding_status VARCHAR(50) NOT NULL,
                ple_year INTEGER NOT NULL,
                ple_index VARCHAR(50) NOT NULL,
                english_agg VARCHAR(10) NOT NULL,
                maths_agg VARCHAR(10) NOT NULL,
                science_agg VARCHAR(10) NOT NULL,
                social_agg VARCHAR(10) NOT NULL,
                total_aggregates VARCHAR(10) NOT NULL,
                division VARCHAR(10) NOT NULL,
                uce_year INTEGER,
                uce_index VARCHAR(50),
                uce_results TEXT,
                health_needs TEXT,
                talents TEXT,
                father_name VARCHAR(100),
                father_nin VARCHAR(50),
                father_contact VARCHAR(50),
                father_occupation VARCHAR(100),
                father_district VARCHAR(100),
                mother_name VARCHAR(100),
                mother_nin VARCHAR(50),
                mother_contact VARCHAR(50),
                mother_occupation VARCHAR(100),
                mother_district VARCHAR(100),
                guardian_name VARCHAR(100) NOT NULL,
                guardian_nin VARCHAR(50) NOT NULL,
                guardian_contact VARCHAR(50) NOT NULL,
                guardian_occupation VARCHAR(100) NOT NULL,
                guardian_district VARCHAR(100) NOT NULL,
                declaration_agreed BOOLEAN DEFAULT FALSE,
                declaration_date DATE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_applications_app_number ON applications(application_number);
            CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
            CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);

            -- Update Users Table Schema if it exists (Alter)
            DO $$
            BEGIN
                -- Add google_id if missing
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='google_id') THEN
                    ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
                END IF;
                -- Make password_hash nullable
                ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
                -- Add avatar_url if missing
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url') THEN
                    ALTER TABLE users ADD COLUMN avatar_url TEXT;
                END IF;
            END $$;
        `;

        await db.query(sql);

        res.status(200).json({ success: true, message: 'Database Initialized Successfully' });
    } catch (error) {
        console.error('Migration Failed:', error);
        res.status(500).json({ error: 'Migration Failed', details: error.message });
    }
}
