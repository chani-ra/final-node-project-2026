import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// טעינת משתני סביבה
dotenv.config();

// יצירת transporter עם הגדרות מאובטחות
const createTransporter = () => {
  // שימוש ב-Gmail עם App Password (מומלץ)
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD // App Password מגוגל
      }
    });
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

const transporter = createTransporter();

// פונקציה לשליחת מייל בסיסי
const sendEmail = async (to, subject, text, html = null) => {
  try {
    const mailOptions = {
      from: `"English Learning Platform" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      ...(html && { html })
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

// פונקציות ספציפיות לשליחת מיילים שונים
export const EmailService = {
  // מייל ברכה למשתמש חדש
  sendWelcomeEmail: async (userEmail, userName) => {
    const subject = 'Welcome to English Learning Platform! 🎉';
    const text = `
      Hello ${userName}!

      Welcome to our English learning platform. We're excited to help you improve your English skills!

      Start exploring courses and begin your learning journey today.

      Best regards,
      English Learning Team
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Welcome to English Learning Platform! 🎉</h2>
        <p>Hello <strong>${userName}</strong>!</p>
        <p>Welcome to our English learning platform. We're excited to help you improve your English skills!</p>
        <p>Start exploring courses and begin your learning journey today.</p>
        <br>
        <p>Best regards,<br>English Learning Team</p>
      </div>
    `;

    return await sendEmail(userEmail, subject, text, html);
  },

  // מייל התראה על התקדמות
  sendProgressNotification: async (userEmail, userName, courseTitle, progress) => {
    const subject = `Great progress in ${courseTitle}! 📈`;
    const text = `
      Hi ${userName},

      You've made excellent progress in "${courseTitle}" - you're now ${progress}% complete!

      Keep up the great work!

      Best regards,
      English Learning Team
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">Great progress! 📈</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>You've made excellent progress in "<strong>${courseTitle}</strong>" - you're now <strong>${progress}%</strong> complete!</p>
        <p>Keep up the great work!</p>
        <br>
        <p>Best regards,<br>English Learning Team</p>
      </div>
    `;

    return await sendEmail(userEmail, subject, text, html);
  },

  // מייל תוצאות בחן
  sendQuizResult: async (userEmail, userName, quizTitle, score, passed) => {
    const status = passed ? 'Congratulations! 🎉' : 'Keep practicing! 💪';
    const subject = `Quiz Results: ${quizTitle}`;

    const text = `
      Hi ${userName},

      Here are your results for "${quizTitle}":
      Score: ${score}%

      ${passed ? 'Congratulations! You passed the quiz.' : 'Keep practicing to improve your score.'}

      Best regards,
      English Learning Team
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${passed ? '#4CAF50' : '#FF9800'};">${status}</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Here are your results for "<strong>${quizTitle}</strong>":</p>
        <p style="font-size: 18px; font-weight: bold;">Score: ${score}%</p>
        <p>${passed ? 'Congratulations! You passed the quiz.' : 'Keep practicing to improve your score.'}</p>
        <br>
        <p>Best regards,<br>English Learning Team</p>
      </div>
    `;

    return await sendEmail(userEmail, subject, text, html);
  },

  // מייל השלמת קורס
  sendCourseCompletion: async (userEmail, userName, courseTitle) => {
    const subject = `Congratulations! Course Completed: ${courseTitle} 🏆`;
    const text = `
      Congratulations ${userName}!

      You have successfully completed the course "${courseTitle}".

      Well done! Keep learning and improving your English skills.

      Best regards,
      English Learning Team
    `;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FFD700;">🏆 Course Completed!</h2>
        <p>Congratulations <strong>${userName}</strong>!</p>
        <p>You have successfully completed the course "<strong>${courseTitle}</strong>".</p>
        <p>Well done! Keep learning and improving your English skills.</p>
        <br>
        <p>Best regards,<br>English Learning Team</p>
      </div>
    `;

    return await sendEmail(userEmail, subject, text, html);
  }
};

export default sendEmail;