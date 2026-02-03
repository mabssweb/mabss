
import { OAuth2Client } from 'google-auth-library';
import * as db from './db';
import { signToken, setAuthCookie } from './auth';

// Lazy initialization to avoid crashes if env vars aren't set
let client = null;

function getGoogleClient() {
    if (!client) {
        if (!process.env.GOOGLE_CLIENT_ID) {
            throw new Error('GOOGLE_CLIENT_ID environment variable is not set');
        }
        client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }
    return client;
}

export async function verifyGoogleToken(token) {
    try {
        const googleClient = getGoogleClient();
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        return {
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            googleId: payload.sub,
        };
    } catch (error) {
        console.error('Error verifying Google token:', error);
        return null;
    }
}

export async function handleGoogleAuth(googleUser, res) {
    const { email, name, googleId } = googleUser;

    try {
        // Check if user exists
        const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (existingUser.rows && existingUser.rows.length > 0) {
            // User exists - login
            const user = existingUser.rows[0];
            const token = signToken(user);
            setAuthCookie(res, token);

            return {
                success: true,
                isNewUser: false,
                user: { id: user.id, email: user.email, role: user.role }
            };
        } else {
            // New user - create account
            const result = await db.query(
                'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
                [email, 'google_oauth', 'student'] // No password for OAuth users
            );

            if (!result.rows || result.rows.length === 0) {
                throw new Error('Failed to create user account');
            }

            const newUser = result.rows[0];
            const token = signToken(newUser);
            setAuthCookie(res, token);

            return {
                success: true,
                isNewUser: true,
                user: { id: newUser.id, email: newUser.email, role: newUser.role }
            };
        }
    } catch (error) {
        console.error('Google auth error:', error);
        throw error;
    }
}
