const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `${options.fromName || 'Talent and Beauty'} <${process.env.EMAIL_FROM}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

const sendPasswordSetEmail = async (email, token, firstName) => {
  const resetUrl = `${process.env.FRONTEND_URL}/set-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Welcome to Talent and Beauty!</h2>
          <p>Hi ${firstName},</p>
          <p>Your talent profile has been successfully created. Please set your password to activate your account and start using the platform.</p>
          <p>Click the button below to set your password:</p>
          <a href="${resetUrl}" class="button">Set Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${resetUrl}</p>
          <p>This link will expire in 7 days.</p>
          <p>If you didn't create this account, please ignore this email.</p>
          <div class="footer">
            <p>Best regards,<br>The Talent and Beauty Team</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    email,
    subject: 'Set Your Password - Talent and Beauty',
    html,
  });
};

export const sendContactResponseEmail = async (contact, message) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f9f9f9;
            padding: 0;
            margin: 0;
          }
          .container {
            max-width: 600px;
            background: #fff;
            margin: 40px auto;
            padding: 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          }
          .header {
            border-bottom: 2px solid #007bff;
            margin-bottom: 16px;
            padding-bottom: 8px;
          }
          .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #777;
            border-top: 1px solid #eee;
            padding-top: 10px;
          }
          .message-box {
            background: #f3f4f6;
            padding: 16px;
            border-radius: 6px;
            font-size: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Response to Your Inquiry</h2>
          </div>
          <p>Hi ${contact.name || "there"},</p>
          <p>Thank you for reaching out. Here’s our response:</p>
          <div class="message-box">
            <p>${message}</p>
          </div>
          <p>We appreciate your patience and look forward to assisting you further.</p>
          <div class="footer">
            <p>Best regards,<br/>The Talent and Beauty Team</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    email: contact.email,
    subject: "Response to Your Inquiry - Talent and Beauty",
    html,
  });
};

const sendPasswordResetEmail = async (email, token, name) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Password Reset Request</h2>
          <p>Hi ${name},</p>
          <p>You requested to reset your password. Click the button below to proceed:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${resetUrl}</p>
          <p>This link will expire in 30 minutes.</p>
          <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          <div class="footer">
            <p>Best regards,<br>The Talent and Beauty Team</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    email,
    subject: 'Password Reset Request - Talent and Beauty',
    html,
  });
};

const sendWelcomeEmail = async (email, name, role) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Welcome to Talent and Beauty!</h2>
          <p>Hi ${name},</p>
          <p>Your account has been successfully created. Welcome to our platform!</p>
          <p>You can now log in and start ${role === 'talent' ? 'building your portfolio' : 'discovering amazing talents'}.</p>
          <a href="${process.env.FRONTEND_URL}/login" class="button">Login Now</a>
          <div class="footer">
            <p>Best regards,<br>The Talent and Beauty Team</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    email,
    subject: 'Welcome to Talent and Beauty',
    html,
  });
};

const sendContactConfirmationEmail = async (email, name) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Thank You for Contacting Us!</h2>
          <p>Hi ${name},</p>
          <p>We've received your message and our team will get back to you as soon as possible.</p>
          <p>Typically, we respond within 24-48 hours.</p>
          <div class="footer">
            <p>Best regards,<br>The Talent and Beauty Team</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    email,
    subject: 'Message Received - Talent and Beauty',
    html,
  });
};

const sendAdminNotificationEmail = async (subject, message) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>${subject}</h2>
          <div class="alert">
            ${message}
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    email: process.env.ADMIN_EMAIL,
    subject: `[Admin Alert] ${subject}`,
    html,
  });
};

const sendARCONNotificationEmail = async (subject, message, attachments = []) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .info { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>${subject}</h2>
          <div class="info">
            ${message}
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    email: process.env.ARCON_EMAIL,
    subject: `[ARCON] ${subject}`,
    html,
  });
};

const sendVerificationEmail = async (email, token, name) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Email Verification - Talent and Beauty</h2>
          <p>Hi ${name},</p>
          <p>Thank you for registering with Talent and Beauty! Please verify your email address by clicking the button below:</p>
          <a href="${verifyUrl}" class="button">Verify Email</a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${verifyUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn’t sign up, you can safely ignore this email.</p>
          <div class="footer">
            <p>Best regards,<br>The Talent and Beauty Team</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    email,
    subject: 'Verify Your Email - Talent and Beauty',
    html,
  });
};

module.exports = {
  sendEmail,
  sendPasswordSetEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendContactConfirmationEmail,
  sendAdminNotificationEmail,
  sendARCONNotificationEmail,
  sendVerificationEmail,
  sendContactResponseEmail,
};
