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

-- Sample Data (Optional)
VALUES 
('Welcome to the New Term', 'MABSS welcomes all students back for the new academic term.', '<p>We are excited to start another term of excellence...</p>', 'https://via.placeholder.com/800x400', NOW());

-- Admission System Tables

-- Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'accepted', 'rejected', 'interview')),
    
    -- Personal Info
    surname VARCHAR(100) NOT NULL,
    other_names VARCHAR(100) NOT NULL,
    lin VARCHAR(50) NOT NULL,
    dob DATE NOT NULL,
    sex VARCHAR(10) NOT NULL,
    class_applying VARCHAR(10) NOT NULL, -- e.g. S.1, S.5
    age INTEGER NOT NULL,
    former_school VARCHAR(255) NOT NULL,
    
    -- Place of Birth
    birth_country VARCHAR(100) NOT NULL,
    birth_district VARCHAR(100) NOT NULL,
    birth_county VARCHAR(100) NOT NULL,
    birth_parish VARCHAR(100) NOT NULL,
    birth_village VARCHAR(100) NOT NULL,
    
    -- Admission Mode
    admission_mode VARCHAR(50) NOT NULL,
    
    -- Learner Category
    parent_category VARCHAR(50) NOT NULL, -- Civilian/Soldier
    day_status VARCHAR(50) NOT NULL, -- Day Civilian/Day Soldier
    boarding_status VARCHAR(50) NOT NULL, -- Boarder Civilian/Boarder Soldier
    
    -- PLE Grades
    ple_year INTEGER NOT NULL,
    ple_index VARCHAR(50) NOT NULL,
    english_agg VARCHAR(10) NOT NULL, -- string to allow 'D1', 'C3' etc or raw numbers
    maths_agg VARCHAR(10) NOT NULL,
    science_agg VARCHAR(10) NOT NULL,
    social_agg VARCHAR(10) NOT NULL,
    total_aggregates VARCHAR(10) NOT NULL,
    division VARCHAR(10) NOT NULL,
    
    -- UCE Grades (Optional, for A-level)
    uce_year INTEGER,
    uce_index VARCHAR(50),
    uce_results TEXT, -- JSON string or text summary
    
    -- Personal Needs
    health_needs TEXT,
    talents TEXT,
    
    -- Parent/Guardian Info
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
    
    -- Declaration
    declaration_agreed BOOLEAN DEFAULT FALSE,
    declaration_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by application number
CREATE INDEX IF NOT EXISTS idx_applications_app_number ON applications(application_number);
-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- Application Documents Table
CREATE TABLE IF NOT EXISTS application_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'ple_slip', 'uce_slip', 'guardian_id'
    file_path TEXT NOT NULL, -- Storage path
    file_url TEXT, -- Public/Signed URL (optional, can be derived)
    mime_type VARCHAR(50),
    size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_docs_app_id ON application_documents(application_id);

-- RLS Policies (Enable RLS generally first)
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;

-- Policy: INSERT (Public/Anon can insert)
-- Ideally authenticated user, but for open admission form, anon is okay if restricted.
CREATE POLICY "Enable insert for everyone" ON applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for everyone" ON application_documents FOR INSERT WITH CHECK (true);

-- Policy: SELECT (Admin only or Own Application)
-- Since we don't have user auth for applicants yet (just app number),
-- we restrict SELECT to service_role (backend) or maybe implicit based on some token.
-- For now, allow service_role key to bypass RLS, default deny for anon on SELECT.
-- (No explicitly permissive SELECT policy for anon users to prevent scraping)



-- Users Table (Authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Update Applications to link to User (One-to-One or One-to-Many)
-- Assuming one application per student for now, or allow multiple.
-- We verify if column exists first to avoid error in migration script re-run, 
-- but simpler to just alter. `migrate-db.js` is simple query runner.
-- better to add the column if not exists.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='applications' AND column_name='user_id') THEN
        ALTER TABLE applications ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
        CREATE INDEX idx_applications_user_id ON applications(user_id);
    END IF;
END $$;
