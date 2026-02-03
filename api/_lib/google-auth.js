
import { OAuth2Client } from 'google-auth-library';
import * as db from './db.js';
import { signToken, setAuthCookie } from './auth.js';

// Lazy initialization to avoid crashes if env vars aren't set
let client = null;

function getGoogleClient() {
    if (!client) {
        const clientId = process.env.GOOGLE_CLIENT_ID || '1066040941987-6fotl7k1qvcgtb3snt87lr4i1ujm21oj.apps.googleusercontent.com';
        if (!clientId) {
            throw new Error('GOOGLE_CLIENT_ID environment variable is not set');
        }
        client = new OAuth2Client(clientId);
    }
    return client;
}

export async function verifyGoogleToken(token) {
    try {
        const googleClient = getGoogleClient();
        const clientId = process.env.GOOGLE_CLIENT_ID || '1066040941987-6fotl7k1qvcgtb3snt87lr4i1ujm21oj.apps.googleusercontent.com';
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: clientId,
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
    const { email, name, picture, googleId } = googleUser;

    try {
        // 1. Check if user exists by google_id (most reliable)
        let result = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);

        // 2. If not found by google_id, check by email (legacy/first-time link)
        if (result.rows.length === 0) {
            result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

            // If found by email but no google_id, we should update it to link them
            if (result.rows.length > 0) {
                console.log('Linking existing email user to Google ID');
                await db.query(
                    'UPDATE users SET google_id = $1, name = COALESCE(name, $2), picture = COALESCE(picture, $3) WHERE email = $4',
                    [googleId, name, picture, email]
                );
                // Re-fetch to get updated data
                result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
            }
        }

        if (result.rows && result.rows.length > 0) {
            // LOGIN SUCCESS
            const user = result.rows[0];

            // Optional: Update profile info if changed
            if (user.name !== name || user.picture !== picture) {
                await db.query('UPDATE users SET name = $1, picture = $2 WHERE id = $3', [name, picture, user.id]);
                user.name = name;
                user.picture = picture;
            }

            const token = signToken(user);
            setAuthCookie(res, token);

            return {
                success: true,
                isNewUser: false,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    name: user.name,
                    picture: user.picture
                }
            };
        } else {
            // SIGNUP (New User)
            console.log('Creating new Google user');
            const insertResult = await db.query(
                `INSERT INTO users (email, google_id, name, picture, role, password_hash) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING id, email, role, name, picture`,
                [email, googleId, name, picture, 'student', null] // password_hash is null for OAuth
            );

            if (!insertResult.rows || insertResult.rows.length === 0) {
                throw new Error('Failed to create user account');
            }

            const newUser = insertResult.rows[0];
            const token = signToken(newUser);
            setAuthCookie(res, token);

            return {
                success: true,
                isNewUser: true,
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    role: newUser.role,
                    name: newUser.name,
                    picture: newUser.picture
                }
            };
        }
    } catch (error) {
        console.error('Google auth database error:', error);
        throw error;
    }
}
