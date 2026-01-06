import nodemailer from 'nodemailer';

   const transporter = nodemailer.createTransport({
       service: 'gmail', // או שירות דואר אחר
       auth: {
           user: 'your-email@gmail.com',
           pass: 'your-email-password'
       }
   });

   const sendEmail = (to, subject, text) => {
       const mailOptions = {
           from: '035701204a@gmail.com',
           to,
           subject,
           text
       };

       transporter.sendMail(mailOptions, (error, info) => {
           if (error) {
               console.log('Error:', error);
           } else {
               console.log('Email sent:', info.response);
           }
       });
   };

export default sendEmail;