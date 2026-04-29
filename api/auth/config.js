export default function handler(req, res) {
    res.status(200).json({
        googleClientId: process.env.GOOGLE_CLIENT_ID || '1066040941987-6fotl7k1qvcgtb3snt87lr4i1ujm21oj.apps.googleusercontent.com'
    });
}
