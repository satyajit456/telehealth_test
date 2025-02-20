import crypto from 'crypto';
// const nodemailer = require('nodemailer');

// Generate a 6-digit OTP
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Simulate OTP verification
export const verifyOTP = async (userOTP: number, storedOTP: number, expirationTime: number | string) => {
  const currentTime = Date.now();
  return Number(userOTP) === Number(storedOTP) && currentTime < Number(expirationTime);
};

// Send OTP via email
const sendOTPByEmail = async (email:string, otp:string) => {
  // Create a test account if you don't have real email credentials
//   let testAccount = await nodemailer.createTestAccount();

//   // Create a transporter
//   let transporter = nodemailer.createTransport({
//     host: "smtp.ethereal.email",
//     port: 587,
//     secure: false,
//     auth: {
//       user: testAccount.user,
//       pass: testAccount.pass,
//     },
//   });

//   // Send email
//   let info = await transporter.sendMail({
//     from: '"Healthcare Management System" <noreply@healthcaresystem.com>',
//     to: email,
//     subject: "Your OTP for verification",
//     text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
//     html: `<b>Your OTP is: ${otp}</b><br>It will expire in 10 minutes.`,
//   });

//   console.log("Message sent: %s", info.messageId);
//   console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
};
