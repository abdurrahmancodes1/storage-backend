// utils/sendOtpMail.js
import { resend } from "./mailer.js";

const sendOtpMail = async (email, otp) => {
  const result = await resend.emails.send({
    from: "Storage App <onboarding@resend.dev>",
    to: "ar7862204@gmail.com",
    subject: "Verify your account",
    html: `<h2>Your OTP is ${otp}</h2>
         <p>Valid for 5 minutes.</p>`,
  });
};

export default sendOtpMail;
