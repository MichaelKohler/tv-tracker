import type { User } from "@prisma/client";
import { randomUUID } from "crypto";

import {
  getUserByEmail,
  hashPasswordResetToken,
  revokePasswordResets,
} from "./user.server";
import { logError, logInfo } from "../logger.server";
import type { Prisma } from "../generated/prisma";
import { lockUser } from "./session.server";
import { prisma } from "../db.server";
import { sendPasswordResetMail } from "./mail.server";

export async function triggerPasswordReset(email: User["email"]) {
  logInfo("Password reset triggered", { email });

  // Always generate a token to maintain consistent timing
  const token = randomUUID();
  const hashedToken = hashPasswordResetToken(token);

  // Check if user exists
  const user = await getUserByEmail(email);

  if (user) {
    try {
      await prisma.$transaction(
        async (transaction: Prisma.TransactionClient) => {
          await lockUser(transaction, user.id);
          await revokePasswordResets(transaction, user.id);
          await transaction.passwordReset.create({
            data: {
              userId: user.id,
              token: hashedToken,
            },
          });
        }
      );

      logInfo("Password reset entry created", { email });

      void sendPasswordResetMail({ email, token });
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
