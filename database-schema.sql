-- Drop table if exists to ensure clean state during testing (Optional, be careful in production!)
-- DROP TABLE IF EXISTS news;

CREATE TABLE IF NOT EXISTS news (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at DESC);

-- Sample Data for Testing
INSERT INTO news (title, summary, content, featured_image_url, created_at)
VALUES 
(
  'End-of-Term Exams Begin Monday', 
  'Next week marks the start of the End-of-Term Examinations for students in S.1, S.2, S.3, and S.5.', 
  '<p>Next week marks the start of the End-of-Term Examinations for students in S.1, S.2, S.3, and S.5. The exams will run from Monday, under strict invigilation.</p><p>Students are advised to prepare adequately.</p>', 
  'https://res.cloudinary.com/dr7bzccrr/image/upload/v1765346644/exams_ptspgl.jpg',
  NOW()
),
(
  'Capacity Building Workshop 2025', 
  'The Capacity Building Workshop 2025 at Mbarara Army Boarding Secondary School was held successfully.', 
  '<p>The Capacity Building Workshop 2025 at Mbarara Army Boarding Secondary School was held on 24th October 2025 under the theme Promoting Academic Excellence for Holistic Growth.</p>', 
  'https://res.cloudinary.com/dr7bzccrr/image/upload/v1765345625/workshop_tubika.jpg',
  NOW() - INTERVAL '1 day'
),
(
  'Administration Group Photo', 
  'HeadTeacher & Deputy HeadTeachers together with the JSFESC Brigadier Gen Richard Karemire.', 
  '<p>HeadTeacher & Deputy HeadTeachers together with the JSFESC Brigadier Gen Richard Karemire. Joint Staff of Formal Education Sports & Culture (JSFESC)</p>', 
  'https://res.cloudinary.com/dr7bzccrr/image/upload/v1765346697/hod_vcreb7.jpg',
  NOW() - INTERVAL '2 days'
);
