import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 10;

async function seed() {
  const email = "rachel@remix.run";
  const password = "rachelrox";

  // cleanup the existing database
  await prisma.user.delete({ where: { email } }).catch(() => {
    // no worries if it doesn't exist yet
  });

  const user = await prisma.user.create({
    data: {
      email,
    },
  });

  const hashedPassword = await hash(password, BCRYPT_ROUNDS);

  await prisma.account.create({
    data: {
      id: user.id,
      accountId: user.id,
      providerId: "username",
      userId: user.id,
      password: hashedPassword,
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
