import type { User, PasswordReset } from "@prisma/client";
import { createTransport } from "nodemailer";

import { logError, logInfo } from "../utils/logger.server";

export async function sendPasswordResetMail({
  email,
  token,
}: {
  email: User["email"];
  token: PasswordReset["token"];
}) {
  const { SMTP_HOST, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_EMAIL || !SMTP_PASSWORD) {
    logInfo("SMTP not configured - password reset email will not be sent", {
      email,
      missingConfig: {
        SMTP_HOST: !SMTP_HOST,
        SMTP_PORT: !SMTP_PORT,
        SMTP_EMAIL: !SMTP_EMAIL,
        SMTP_PASSWORD: !SMTP_PASSWORD,
      },
    });
    return;
  }

  const transporter = createTransport({
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
    text: `Somebody has requested a password reset for tv-tracker. If this was you, go to /account?token=${token} to reset your password. The link will expire in 1 hour. If this wasn't you, you do not need to take any further action.`,
  };

  try {
    await transporter.sendMail(message);
    logInfo("Password reset email sent successfully", { email });
  } catch (error) {
    logError(
      "Failed to send password reset email",
      {
        email,
        smtpHost: SMTP_HOST,
        smtpPort: SMTP_PORT,
      },
      error
    );
  }
}
