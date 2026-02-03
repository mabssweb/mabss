
import * as db from '../_lib/db';

export default async function handler(req, res) {
    try {
        const result = await db.query('SELECT NOW() as now');
        return res.status(200).json({
            status: 'ok',
            time: result.rows[0].now,
            env_db_set: !!process.env.DATABASE_URL
        });
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: error.message,
            stack: error.stack
        });
    }
}
