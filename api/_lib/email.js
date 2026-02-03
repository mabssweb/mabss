
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com', // Default to gmail or common
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export async function sendEmail({ to, subject, html }) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('Email not sent: SMTP credentials missing.');
        return false;
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"MABSS Admission" <no-reply@mabss.ac.ug>',
            to,
            subject,
            html,
        });
        console.log('Message sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}
