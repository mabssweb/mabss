
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    try {
        // Just verify imports work and we can instantiate objects
        const client = new OAuth2Client('test-id');
        const token = jwt.sign({ foo: 'bar' }, 'secret');

        return res.status(200).json({
            status: 'ok',
            google_lib: 'loaded',
            jwt_lib: 'loaded',
            token_sample: token
        });
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: error.message,
            stack: error.stack
        });
    }
}
