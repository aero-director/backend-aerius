// src/utils/email.js
import nodemailer from 'nodemailer';

let transporter;

export const initMailer = () => {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
};

export const sendMail = async ({ to, subject, html }) => {
  const mailer = initMailer();
  const info = await mailer.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
  console.log('Message sent: %s', info.messageId);
  return info;
};
