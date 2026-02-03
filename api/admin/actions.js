
import pg from 'pg';
import { sendEmail, EMAIL_TEMPLATES } from '../_lib/email.js';

const { Pool } = pg;
let pool;

function getPool() {
    if (!pool) {
        if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL is missing");
        }
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    }
    return pool;
}

import { getCurrentUser } from '../_lib/auth.js';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    let isAdmin = false;

    // 1. Check Header Token (Legacy/Script Access)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && authHeader.substring(7) === process.env.ADMIN_PASSWORD) {
        isAdmin = true;
    }

    // 2. Check User Session (Google Sign-In / Cookie)
    if (!isAdmin) {
        try {
            const user = await getCurrentUser(req);
            if (user && user.role === 'admin') {
                isAdmin = true;
            }
        } catch (e) {
            console.warn('Auth check failed:', e.message);
        }
    }

    if (!isAdmin) {
        return res.status(401).json({ error: 'Unauthorized: Admin access required' });
    }

    const db = getPool();

    try {
        // 2. GET: List Applications (or single application by ID)
        if (req.method === 'GET') {
            const { id, status, limit = 50, page = 1 } = req.query;

            // If ID is provided, fetch single application
            if (id) {
                const result = await db.query(
                    `SELECT a.*, u.email as user_email
                     FROM applications a
                     JOIN users u ON a.user_id = u.id
                     WHERE a.id = $1`,
                    [id]
                );

                if (result.rows.length === 0) {
                    return res.status(404).json({ error: 'Application not found' });
                }

                return res.status(200).json({ application: result.rows[0] });
            }

            // Otherwise, list all applications with filters
            const offset = (page - 1) * limit;

            let query = `
                SELECT a.*, u.email as user_email
                FROM applications a
                JOIN users u ON a.user_id = u.id
            `;
            const params = [];

            if (status && status !== 'all') {
                query += ` WHERE a.status = $1`;
                params.push(status);
            }

            query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(limit, offset);

            const result = await db.query(query, params);

            // Get total count for pagination
            const countQuery = status && status !== 'all'
                ? 'SELECT COUNT(*) FROM applications WHERE status = $1'
                : 'SELECT COUNT(*) FROM applications';
            const countParams = status && status !== 'all' ? [status] : [];
            const countRes = await db.query(countQuery, countParams);

            return res.status(200).json({
                applications: result.rows,
                total: parseInt(countRes.rows[0].count),
                page: parseInt(page),
                totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit)
            });
        }

        // 3. PUT: Update Status (Approve/Reject)
        if (req.method === 'PUT') {
            const { id } = req.query;
            const { status } = req.body;

            if (!id || !['accepted', 'rejected', 'under_review'].includes(status)) {
                return res.status(400).json({ error: 'Invalid ID or Status' });
            }

            // Update Status
            const updateRes = await db.query(
                `UPDATE applications SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
                [status, id]
            );

            if (updateRes.rows.length === 0) {
                return res.status(404).json({ error: 'Application not found' });
            }

            const application = updateRes.rows[0];

            // Fetch User Email for notification
            const userRes = await db.query('SELECT email FROM users WHERE id = $1', [application.user_id]);
            if (userRes.rows.length > 0) {
                const email = userRes.rows[0].email;
                const name = `${application.surname} ${application.other_names}`;

                // Send Email Notification
                if (status === 'accepted') {
                    await sendEmail({
                        to: email,
                        subject: 'MABSS Admission - Application Accepted',
                        html: EMAIL_TEMPLATES.ADMISSION_LETTER(name, application.application_number)
                    });
                } else if (status === 'rejected') {
                    await sendEmail({
                        to: email,
                        subject: 'MABSS Admission - Application Update',
                        html: EMAIL_TEMPLATES.REJECTION_NOTICE(name)
                    });
                }
            }

            return res.status(200).json({ success: true, application });
        }

        // 4. DELETE: Permanently Delete Application
        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Missing ID' });

            await db.query('DELETE FROM applications WHERE id = $1', [id]);
            return res.status(200).json({ message: 'Application deleted permanently' });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (error) {
        console.error('Admin API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
