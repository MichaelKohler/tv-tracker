import type { User, PasswordReset } from "@prisma/client";
import nodemailer from "nodemailer";

export async function sendPasswordResetMail({
  email,
  token,
}: {
  email: User["email"];
  token: PasswordReset["token"];
}) {
  const { SMTP_HOST, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_EMAIL || !SMTP_PASSWORD) {
    console.error("SMTP_NOT_SET_UP");
    return;
  }

  const transporter = nodemailer.createTransport({
    // @ts-expect-error .. for some reason host does not exist on the type
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: {
      user: SMTP_EMAIL,
      pass: SMTP_PASSWORD,
    },
  });

  const message = {
    from: `tv-tracker <${process.env.SMTP_EMAIL}>`,
    to: `${email} <${email}>`,
    subject: "Password reset code",
    text: `Somebody has requested a password reset for tv-tracker. If this was you, go to https://.../password/change?token=${token} to reset your password. The link will expire in 1 hour. If this wasn't you, you do not need to take any further action.`,
  };

  try {
    await transporter.sendMail(message);
  } catch (error) {
    console.error("SEND_MAIL_FAILED", error);
    return;
  }

  console.log("PASSWORD_RESET_MAIL_SENT", email);
}
