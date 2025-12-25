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
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'News ID is required' });
    }

    try {
        const query = `
      SELECT id, title, summary, content, featured_image_url, created_at
      FROM news
      WHERE id = $1
    `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'News article not found' });
        }

        const item = result.rows[0];
        const news = {
            id: item.id,
            title: item.title,
            summary: item.summary,
            content: item.content,
            image: item.featured_image_url,
            date: item.created_at.toISOString().split('T')[0]
        };

        res.status(200).json(news);

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
