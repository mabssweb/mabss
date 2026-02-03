
import * as db from '../../_lib/db';
import { sendEmail } from '../../_lib/email';
import { getCurrentUser } from '../../_lib/auth';

export default async function handler(req, res) {
    // Protect Route (Admin Only)
    const user = await getCurrentUser(req);
    if (!user || user.role !== 'admin') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;

    if (req.method === 'GET') {
        try {
            const appQuery = `SELECT * FROM applications WHERE id = $1`;
            const appResult = await db.query(appQuery, [id]);

            if (appResult.rows.length === 0) {
                return res.status(404).json({ error: 'Application not found' });
            }

            const application = appResult.rows[0];

            const docQuery = `SELECT id, document_type, file_path, file_url FROM application_documents WHERE application_id = $1`;
            const docResult = await db.query(docQuery, [id]);

            application.application_documents = docResult.rows;

            return res.status(200).json(application);
        } catch (error) {
            console.error('Error fetching application:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    if (req.method === 'POST') {
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'Status is required' });

        try {
            const updateQuery = `
        UPDATE applications 
        SET status = $1, updated_at = NOW() 
        WHERE id = $2 
        RETURNING *
      `;
            const { rows } = await db.query(updateQuery, [status, id]);

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Application not found' });
            }

            const updatedApp = rows[0];

            if (status === 'accepted') {
                const userQuery = `SELECT email FROM users WHERE id = $1`;
                const userResult = await db.query(userQuery, [updatedApp.user_id]);

                if (userResult.rows.length > 0) {
                    const studentEmail = userResult.rows[0].email;
                    const subject = 'Admission Accepted - MABSS';
                    const html = `
                <h1>Congratulations ${updatedApp.surname}!</h1>
                <p>We are pleased to inform you that your application (Ref: <strong>${updatedApp.application_number}</strong>) to Mbarara Army Boarding Secondary School has been <strong>ACCEPTED</strong>.</p>
                <p>Please log in to your portal for further instructions regarding reporting dates and requirements.</p>
                <br>
                <p>Welcome to MABSS!</p>
              `;

                    await sendEmail({ to: studentEmail, subject, html });
                }
            }

            return res.status(200).json({ success: true, application: updatedApp });
        } catch (error) {
            console.error('Error updating status:', error);
            return res.status(500).json({ error: error.message });
        }
    }
}
