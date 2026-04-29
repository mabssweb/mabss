import pg from 'pg';
import formidable from 'formidable';
import { uploadToOCI } from '../_lib/oci.js';

const { Pool } = pg;

let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is missing from environment variables");
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.DATABASE_URL) {
    console.error("Configuration Error: DATABASE_URL is not set.");
    return res.status(500).json({ error: "Server Configuration Error: DATABASE_URL is missing. Please check Vercel Environment Variables." });
  }

  try {
    if (req.method === 'GET') {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 6;
      const offset = (page - 1) * limit;

      const countResult = await getPool().query('SELECT COUNT(*) as total FROM news');
      const total = parseInt(countResult.rows[0].total);

      const result = await getPool().query(`
        SELECT id, title, summary, featured_image_url, created_at
        FROM news ORDER BY created_at DESC LIMIT $1 OFFSET $2
      `, [limit, offset]);

      res.status(200).json({
        news: result.rows.map(item => ({
          id: item.id, title: item.title, summary: item.summary,
          image: item.featured_image_url, date: item.created_at.toISOString().split('T')[0]
        })),
        pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalItems: total, hasNext: (page * limit) < total, hasPrev: page > 1 }
      });

    } else if (req.method === 'POST') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
      const token = authHeader.substring(7);
      if (token !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid credentials' });

      const form = formidable({ multiples: false, maxFileSize: 5 * 1024 * 1024 });
      const [fields, files] = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve([fields, files]);
        });
      });

      const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
      const summary = Array.isArray(fields.summary) ? fields.summary[0] : fields.summary;
      const content = Array.isArray(fields.content) ? fields.content[0] : fields.content;
      const imageFile = Array.isArray(files.image) ? files.image[0] : (files.image || null);

      if (!title || !summary || !content) return res.status(400).json({ error: 'Title, summary, and content are required' });

      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadToOCI(imageFile);
      }

      const sanitizedContent = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

      const result = await getPool().query(`
        INSERT INTO news (title, summary, content, featured_image_url)
        VALUES ($1, $2, $3, $4) RETURNING id, title, summary, featured_image_url, created_at
      `, [title.trim(), summary.trim(), sanitizedContent, imageUrl]);

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
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
