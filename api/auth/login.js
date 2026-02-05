
import * as db from '../_lib/db.js';
import bcrypt from 'bcryptjs';
import { signToken, setAuthCookie } from '../_lib/auth.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password } = req.body;

    // Admin constant password login support
    if (!email && password && password === process.env.ADMIN_PASSWORD) {
        // Return a mock admin user object to issue a token
        const adminUser = { id: 'admin', email: 'admin@mabss.ac.ug', role: 'admin' };
        const token = signToken(adminUser);
        setAuthCookie(res, token);
        return res.status(200).json({ success: true, user: adminUser });
    }

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = signToken(user);
        setAuthCookie(res, token);

        return res.status(200).json({ success: true, user: { id: user.id, email: user.email, role: user.role } });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
