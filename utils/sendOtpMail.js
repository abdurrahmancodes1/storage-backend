// utils/sendOtpMail.js
import { resend } from "./mailer.js";

const sendOtpMail = async (email, otp) => {
  const result = await resend.emails.send({
    from: "StorVault <noreply@storvault.xyz>",
    to: email,
    subject: "Verify your email",
    html: `
    <h2>Your OTP Code</h2>
    <h1>${otp}</h1>
    <p>This code expires in 5 minutes.</p>
  `,
  });
};

export default sendOtpMail;
