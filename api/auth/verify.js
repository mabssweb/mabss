export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    if (password === process.env.ADMIN_PASSWORD) {
        return res.status(200).json({ success: true, message: 'Authenticated successfully' });
    } else {
        return res.status(401).json({ error: 'Invalid password' });
    }
}
