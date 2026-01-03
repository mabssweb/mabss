import pg from 'pg';
import formidable from 'formidable';
import { uploadToOCI, deleteFromOCI } from '../_lib/oci.js';

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
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'News ID is required' });

    // Verify Auth for non-GET methods
    if (req.method === 'PUT' || req.method === 'DELETE') {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token || token !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    try {
        if (req.method === 'GET') {
            const result = await getPool().query('SELECT * FROM news WHERE id = $1', [id]);
            if (result.rows.length === 0) return res.status(404).json({ error: 'News article not found' });

            const item = result.rows[0];
            res.status(200).json({
                id: item.id,
                title: item.title,
                summary: item.summary,
                content: item.content,
                image: item.featured_image_url,
                date: item.created_at.toISOString().split('T')[0]
            });
        }
        else if (req.method === 'DELETE') {
            // 1. Fetch the image URL before deleting
            const getResult = await getPool().query('SELECT featured_image_url FROM news WHERE id = $1', [id]);
            if (getResult.rowCount === 0) return res.status(404).json({ error: 'News article not found' });

            const oldImageUrl = getResult.rows[0].featured_image_url;

            // 2. Delete from database
            await getPool().query('DELETE FROM news WHERE id = $1', [id]);

            // 3. Delete from OCI if exists
            if (oldImageUrl) {
                await deleteFromOCI(oldImageUrl);
            }

            res.status(200).json({ success: true, message: 'News article deleted' });
        }
        else if (req.method === 'PUT') {
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

            if (!title || !summary || !content) {
                return res.status(400).json({ error: 'Title, summary, and content are required' });
            }

            // Get current news to handle image update
            const currentResult = await getPool().query('SELECT featured_image_url FROM news WHERE id = $1', [id]);
            if (currentResult.rowCount === 0) return res.status(404).json({ error: 'News article not found' });

            const oldImageUrl = currentResult.rows[0].featured_image_url;
            let finalImageUrl = oldImageUrl;

            if (imageFile) {
                // Upload new image
                finalImageUrl = await uploadToOCI(imageFile);

                // Clean up old image if different
                if (oldImageUrl && oldImageUrl !== finalImageUrl) {
                    await deleteFromOCI(oldImageUrl);
                }
            }

            const query = `
                UPDATE news 
                SET title = $1, summary = $2, content = $3, featured_image_url = $4
                WHERE id = $5
            `;
            await getPool().query(query, [title.trim(), summary.trim(), content.trim(), finalImageUrl, id]);
            res.status(200).json({ success: true, message: 'News article updated' });
        }
        else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
}
