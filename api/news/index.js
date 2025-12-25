import pg from 'pg';
const { Pool } = pg;

// Neon PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // Get paginated news for news listing page
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 6;
      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = 'SELECT COUNT(*) as total FROM news';
      const countResult = await pool.query(countQuery);
      const total = parseInt(countResult.rows[0].total);

      // Get news items
      const query = `
        SELECT id, title, summary, featured_image_url, created_at
        FROM news
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await pool.query(query, [limit, offset]);
      const news = result.rows.map(item => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        image: item.featured_image_url,
        date: item.created_at.toISOString().split('T')[0]
      }));

      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        news,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });

    } else if (req.method === 'POST') {
      // Create new news (admin only)
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.substring(7); // Remove 'Bearer '

      // Simple password check (in production, use proper JWT or similar)
      if (token !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const { title, summary, content, featuredImageUrl } = req.body;

      // Validation
      if (!title || !summary || !content) {
        return res.status(400).json({ error: 'Title, summary, and content are required' });
      }

      // Basic HTML sanitization (remove script tags)
      const sanitizedContent = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

      const insertQuery = `
        INSERT INTO news (title, summary, content, featured_image_url)
        VALUES ($1, $2, $3, $4)
        RETURNING id, title, summary, featured_image_url, created_at
      `;

      const result = await pool.query(insertQuery, [
        title.trim(),
        summary.trim(),
        sanitizedContent,
        featuredImageUrl || null
      ]);

      const newNews = result.rows[0];

      res.status(201).json({
        id: newNews.id,
        title: newNews.title,
        summary: newNews.summary,
        image: newNews.featured_image_url,
        date: newNews.created_at.toISOString().split('T')[0],
        message: 'News article created successfully'
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
