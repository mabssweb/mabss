
import nodemailer from 'nodemailer';

// Configure Transporter (Gmail or generic SMTP)
const transporter = nodemailer.createTransport({
    service: 'gmail', // Or use host/port for other providers
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export async function sendEmail({ to, subject, html }) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Email credentials missing. Skipping email send.');
        return false;
    }

    try {
        const info = await transporter.sendMail({
            from: `"MABSS Admissions" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log('Email sent:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

export const EMAIL_TEMPLATES = {
    ADMISSION_LETTER: (name, appNumber) => `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
            <div style="text-align: center; border-bottom: 2px solid #006400; padding-bottom: 10px;">
                <h1 style="color: #006400;">Mbarara Army Boarding Secondary School</h1>
                <h2>Congratulations!</h2>
            </div>
            <p>Dear ${name},</p>
            <p>We are pleased to inform you that your application for admission to MABSS has been <strong>ACCEPTED</strong>.</p>
            <p><strong>Application Number:</strong> ${appNumber}</p>
            <p>Please log in to your dashboard to download your official Admission Letter and view the reporting requirements.</p>
            <p><a href="https://mabss.ac.ug/dashboard.html" style="background: #006400; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
            <p>Regards,<br>Admissions Office</p>
        </div>
    `,
    REJECTION_NOTICE: (name) => `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px;">
            <div style="text-align: center; border-bottom: 2px solid #8B0000; padding-bottom: 10px;">
                <h1 style="color: #006400;">Mbarara Army Boarding Secondary School</h1>
                <h2>Application Status Update</h2>
            </div>
            <p>Dear ${name},</p>
            <p>Thank you for your interest in MABSS. after careful review of your application, we regret to inform you that we are unable to offer you admission at this time.</p>
            <p>We wish you the best in your future academic endeavors.</p>
            <p>Regards,<br>Admissions Office</p>
        </div>
    `
};
