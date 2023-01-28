import type { User } from "@prisma/client";
import { createHash, randomUUID } from "crypto";

import { prisma } from "../db.server";
import { sendPasswordResetMail } from "./mail.server";

export async function triggerPasswordReset(email: User["email"]) {
  prisma.passwordReset.deleteMany({
    where: {
      email,
    },
  });

  const token = randomUUID();
  const hashedToken = createHash("sha256").update(token).digest("hex");

  try {
    await prisma.passwordReset.create({
      data: {
        email,
        token: hashedToken,
      },
    });
  } catch (error) {
    console.error(error);
  }

  sendPasswordResetMail({ email, token });
}
