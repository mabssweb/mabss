
import * as db from '../../_lib/db';
import { getCurrentUser } from '../../_lib/auth';

export default async function handler(req, res) {
    // Protect Route (Admin Only)
    const user = await getCurrentUser(req);
    if (!user || user.role !== 'admin') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const query = `
        SELECT id, application_number, surname, other_names, status, class_applying, created_at
        FROM applications
        ORDER BY created_at DESC
    `;

        const { rows } = await db.query(query);

        return res.status(200).json(rows);
    } catch (error) {
        console.error('Fetch error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
