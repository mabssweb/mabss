
import * as db from '../../_lib/db';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { ref } = req.query; // Application Number or LIN

    if (!ref) {
        return res.status(400).json({ error: 'Application Number or LIN is required' });
    }

    try {
        const query = `
        SELECT application_number, status, surname, other_names, created_at 
        FROM applications 
        WHERE application_number = $1 OR lin = $1
    `;

        const { rows } = await db.query(query, [ref]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        return res.status(200).json({
            found: true,
            application: rows[0]
        });

    } catch (error) {
        console.error('Status check error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
