CREATE TABLE news (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  featured_image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_news_created_at ON news(created_at DESC);
