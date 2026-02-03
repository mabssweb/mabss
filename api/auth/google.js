
import { verifyGoogleToken, handleGoogleAuth } from '../../_lib/google-auth';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { credential } = req.body;

    if (!credential) {
        return res.status(400).json({ error: 'Google credential is required' });
    }

    try {
        // Verify the Google token
        const googleUser = await verifyGoogleToken(credential);

        if (!googleUser) {
            return res.status(401).json({ error: 'Invalid Google token' });
        }

        // Handle authentication (login or signup)
        const result = await handleGoogleAuth(googleUser, res);

        return res.status(200).json(result);

    } catch (error) {
        console.error('Google auth error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
}
