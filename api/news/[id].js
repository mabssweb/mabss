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
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'News ID is required' });
    }

    // Verify Auth for non-GET methods
    if (req.method === 'PUT' || req.method === 'DELETE') {
        const authHeader = req.headers.authorization;
        consttoken = authHeader && authHeader.split(' ')[1];
        if (!token || token !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    if (req.method === 'GET') {
        try {
            console.log('Fetching news ID:', id);
            console.log('Query Params:', req.query);

            const result = await pool.query('SELECT * FROM news WHERE id = $1', [id]);

            if (result.rows.length === 0) {
                console.log('News not found for ID:', id);
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
            console.error('Database error details:', error);
            res.status(500).json({ error: 'Internal server error: ' + error.message });
        }
        return;
    }

    if (req.method === 'DELETE') {
        try {
            const result = await pool.query('DELETE FROM news WHERE id = $1 RETURNING id', [id]);
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'News article not found' });
            }
            res.status(200).json({ success: true, message: 'News article deleted' });
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
        return;
    }

    if (req.method === 'PUT') {
        const { title, summary, content, featuredImageUrl } = req.body;

        if (!title || !summary || !content) {
            return res.status(400).json({ error: 'Title, summary, and content are required' });
        }

        try {
            const query = `
                UPDATE news 
                SET title = $1, summary = $2, content = $3, featured_image_url = $4
                WHERE id = $5
                RETURNING id
            `;
            const result = await pool.query(query, [title, summary, content, featuredImageUrl, id]);

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'News article not found' });
            }
            res.status(200).json({ success: true, message: 'News article updated' });
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
        return;
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
