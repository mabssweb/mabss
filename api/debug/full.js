
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import bcrypt from 'bcryptjs';
import * as db from '../_lib/db';
import { verifyGoogleToken } from '../_lib/google-auth';

export default async function handler(req, res) {
    const status = {};
    try {
        status.imports = 'Success';

        // Check DB
        try {
            const time = await db.query('SELECT NOW()');
            status.db = 'Connected: ' + time.rows[0].now;
        } catch (e) {
            status.db = 'Failed: ' + e.message;
        }

        // Check Bcrypt
        try {
            const hash = await bcrypt.hash('test', 1);
            status.bcrypt = 'Working';
        } catch (e) {
            status.bcrypt = 'Failed: ' + e.message;
        }

        // Check JWT
        try {
            const token = jwt.sign({ test: 1 }, 'secret');
            status.jwt = 'Working';
        } catch (e) {
            status.jwt = 'Failed: ' + e.message;
        }

        // Check Env
        status.env = {
            GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing',
            DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Missing',
            JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Missing'
        };

        res.status(200).json(status);
    } catch (error) {
        res.status(500).json({
            error: 'Crash during check',
            details: error.message,
            stack: error.stack
        });
    }
}
