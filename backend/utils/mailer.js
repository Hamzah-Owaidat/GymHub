const nodemailer = require('nodemailer');

function createTransporter() {
  const port = Number(process.env.MAIL_PORT || 587);
  const secure = String(process.env.MAIL_SECURE || 'false').toLowerCase() === 'true';
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port,
    secure,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

async function sendPasswordResetOtpEmail({ toEmail, otpCode }) {
  const transporter = createTransporter();
  const from = process.env.MAIL_FROM || process.env.MAIL_USER;
  const expiresInMinutes = Number(process.env.PASSWORD_RESET_OTP_EXPIRES_MINUTES || 5);

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: 'GymHub Password Reset OTP',
    text: `Your GymHub password reset code is: ${otpCode}. It expires in ${expiresInMinutes} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>GymHub Password Reset</h2>
        <p>Your OTP code is:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otpCode}</p>
        <p>This code expires in ${expiresInMinutes} minutes.</p>
        <p>If you did not request a password reset, you can ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetOtpEmail };
