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
INSERT INTO news (title, summary, content, featured_image_url, created_at)
VALUES 
('Welcome to the New Term', 'MABSS welcomes all students back for the new academic term.', '<p>We are excited to start another term of excellence...</p>', 'https://via.placeholder.com/800x400', NOW());
