
import jwt from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import { parse, serialize } from 'cookie';
import * as db from './db';

// Secret key should be in env, fallback for dev
const JWT_SECRET = process.env.JWT_SECRET || 'mabss-super-secret-key-change-me';

export function signToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
}

// Middleware helper to get user from request
export async function getCurrentUser(req) {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) return null;

    const decoded = verifyToken(token);
    if (!decoded) return null;

    return decoded;
}

export function setAuthCookie(res, token) {
    res.setHeader('Set-Cookie', serialize('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        sameSite: 'strict',
        path: '/'
    }));
}
