import type { User, PasswordReset, Passkey } from "@prisma/client";
import { createTransport } from "nodemailer";

import { logError, logInfo } from "../logger.server";

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

export async function sendPasskeyCreatedMail({
  email,
  passkeyName,
  createdAt,
}: {
  email: User["email"];
  passkeyName: Passkey["name"];
  createdAt: Passkey["createdAt"];
}) {
  const { SMTP_HOST, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD, RP_ORIGIN } =
    process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_EMAIL || !SMTP_PASSWORD) {
    logInfo("SMTP not configured - passkey created email will not be sent", {
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

  const formattedDate = new Date(createdAt).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "long",
  });

  const origin = RP_ORIGIN || "http://localhost:5173";

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Passkey Added</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Raleway', Arial, sans-serif; background-color: #f2faff;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(31, 51, 82, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1f3352 0%, #23395b 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; font-family: 'Dosis', Arial, sans-serif;">
                      New Passkey Added
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; color: #2f2f2f; font-size: 16px; line-height: 1.6;">
                      A new passkey has been added to your TV Tracker account.
                    </p>

                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0; background-color: #f2faff; border-radius: 6px; border-left: 4px solid #9ad6f5;">
                      <tr>
                        <td style="padding: 20px;">
                          <p style="margin: 0 0 10px; color: #23395b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            Passkey Name
                          </p>
                          <p style="margin: 0 0 20px; color: #2f2f2f; font-size: 18px; font-weight: 600;">
                            ${passkeyName}
                          </p>

                          <p style="margin: 0 0 10px; color: #23395b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            Created at
                          </p>
                          <p style="margin: 0 0 20px; color: #2f2f2f; font-size: 16px;">
                            ${formattedDate}
                          </p>

                          <p style="margin: 0 0 10px; color: #23395b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                            Website
                          </p>
                          <p style="margin: 0; color: #2f2f2f; font-size: 16px;">
                            ${origin}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 30px 0 0; color: #2f2f2f; font-size: 16px; line-height: 1.6;">
                      If you did not add this passkey, please secure your account immediately by visiting the account settings and deleting the passkey.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background-color: #f2faff; text-align: center; border-radius: 0 0 8px 8px;">
                    <p style="margin: 0; color: #3a4d6a; font-size: 14px; line-height: 1.6;">
                      This is an automated security notification from TV Tracker
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const textContent = `A new passkey has been added to your TV Tracker account.

Passkey Name: ${passkeyName}
Created at: ${formattedDate}
Website: ${origin}

If you did not add this passkey, please secure your account immediately by visiting the account settings and deleting the passkey.

This is an automated security notification from TV Tracker.`;

  const message = {
    from: `tv-tracker <${process.env.SMTP_EMAIL}>`,
    to: `${email} <${email}>`,
    subject: "New Passkey Added to Your Account",
    text: textContent,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(message);
    logInfo("Passkey created email sent successfully", { email, passkeyName });
  } catch (error) {
    logError(
      "Failed to send passkey created email",
      {
        email,
        passkeyName,
        smtpHost: SMTP_HOST,
        smtpPort: SMTP_PORT,
      },
      error
    );
  }
}
