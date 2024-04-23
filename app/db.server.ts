import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

let prisma: PrismaClient;
const forceTurso = process.env.TURSO_FORCE === "true";

if (process.env.NODE_ENV !== "production" && !forceTurso) {
  prisma = new PrismaClient();
} else {
  const libsql = createClient({
    url: `${process.env.TURSO_DATABASE_URL}`,
    authToken: `${process.env.TURSO_AUTH_TOKEN}`,
  });

  const adapter = new PrismaLibSQL(libsql);
  prisma = new PrismaClient({ adapter });
}

export { prisma };
