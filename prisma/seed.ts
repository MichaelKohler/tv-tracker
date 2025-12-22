import { PrismaClient } from "@prisma/client";
import { auth } from "../app/lib/auth.server.js";

const prisma = new PrismaClient();

async function seed() {
  const email = "rachel@remix.run";

  // cleanup the existing database
  await prisma.user.delete({ where: { email } }).catch(() => {
    // no worries if it doesn't exist yet
  });

  // Create user using Better Auth API
  await auth.api.signUpEmail({
    body: {
      email,
      password: "rachelrox",
      name: "Rachel",
    },
  });

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
