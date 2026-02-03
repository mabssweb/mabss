
import * as db from '../../_lib/db';
import bcrypt from 'bcryptjs';
import { signToken, setAuthCookie } from '../../_lib/auth';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password, role } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const userRole = 'student';

    try {
        const check = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.query(
            'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
            [email, hashedPassword, userRole]
        );

        const user = result.rows[0];
        const token = signToken(user);
        setAuthCookie(res, token);

        return res.status(201).json({ success: true, user });

    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
