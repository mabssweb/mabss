
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
        console.log('1. Received Google auth request');

        // Verify the Google token
        let googleUser;
        try {
            googleUser = await verifyGoogleToken(credential);
            console.log('2. Token verified successfully:', googleUser?.email);
        } catch (e) {
            console.error('Token verification failed:', e);
            throw new Error(`Token verification failed: ${e.message}`);
        }

        if (!googleUser) {
            return res.status(401).json({ error: 'Invalid Google token' });
        }

        // Handle authentication (login or signup)
        console.log('3. Attempting database operation...');
        const result = await handleGoogleAuth(googleUser, res);
        console.log('4. Database operation success');

        return res.status(200).json(result);

    } catch (error) {
        console.error('CRITICAL Google auth error:', error);

        // Safety: Ensure we don't crash while reporting a crash
        const safeError = error || {};
        const message = safeError.message || safeError.toString() || 'Unknown error';
        const stack = safeError.stack || 'No stack trace';
        const step = (typeof message === 'string' && message.includes('Token')) ? 'Verification' : 'Database/Other';

        return res.status(500).json({
            error: 'Authentication failed (Critical)',
            details: message,
            step: step,
            stack: stack
        });
    }
}
