import { createHash, randomUUID } from "crypto";
import type { User } from "@prisma/client";

import { prisma } from "../db.server";
import { logError, logInfo } from "../logger.server";
import { sendPasswordResetMail } from "./mail.server";
import { getUserByEmail } from "./user.server";

export async function triggerPasswordReset(email: User["email"]) {
  logInfo("Password reset triggered", { email });

  // Always generate a token to maintain consistent timing
  const token = randomUUID();
  const hashedToken = createHash("sha256").update(token).digest("hex");

  // Check if user exists
  const userExists = await getUserByEmail(email);

  if (userExists) {
    // Clean up any existing password reset entries for this email
    await prisma.passwordReset.deleteMany({
      where: {
        email,
      },
    });

    try {
      await prisma.passwordReset.create({
        data: {
          email,
          token: hashedToken,
        },
      });

      logInfo("Password reset entry created", { email });

      sendPasswordResetMail({ email, token });
    } catch (error) {
      logError(
        "Failed to create password reset entry",
        {
          email,
        },
        error
      );
    }
  } else {
    // Simulate the same operations for timing consistency
    // Random delay between 50ms and 150ms to prevent timing attacks
    const delay = Math.floor(Math.random() * 100) + 50;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
