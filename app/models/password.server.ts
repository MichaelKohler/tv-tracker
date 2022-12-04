import type { User } from "@prisma/client";
import { createHash, randomUUID } from "crypto";

import { sendPasswordResetMail } from "~/models/mail.server";
import { prisma } from "~/db.server";

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
    console.log(error);
  }

  sendPasswordResetMail({ email, token });
}
