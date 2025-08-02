import { createHash, randomUUID } from "crypto";
import type { User } from "@prisma/client";

import { prisma } from "../db.server";
import { sendPasswordResetMail } from "./mail.server";
import { getUserByEmail } from "./user.server";

export async function triggerPasswordReset(email: User["email"]) {
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

      sendPasswordResetMail({ email, token });
    } catch {
      console.error("Failed to create password reset entry for email:", email);
    }
  } else {
    // Simulate the same operations for timing consistency
    // Random delay between 50ms and 150ms to prevent timing attacks
    const delay = Math.floor(Math.random() * 100) + 50;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
