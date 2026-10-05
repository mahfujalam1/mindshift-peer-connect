import nodemailer from 'nodemailer';
import config from '../config';

const sendEmail = async (options: {
    email: string;
    subject: string;
    html: any;
}) => {
    try {
        const port = parseInt(config.smtp.smtp_port as string) || 465;
        const transporter = nodemailer.createTransport({
            host: config.smtp.smtp_host,
            port,
            secure: port === 465,
            auth: {
                user: config.smtp.smtp_mail,
                pass: config.smtp.smtp_pass,
            },
        });

        const { email, subject, html } = options;

        const mailOptions = {
            from: `"${config.smtp.name}" <${config.smtp.smtp_mail}>`,
            to: email,
            subject,
            html,
        };

        await transporter.sendMail(mailOptions);
    } catch (err) {
        console.log('Email not sent', err);
    }
};

export default sendEmail;
