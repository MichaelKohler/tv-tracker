import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

let prisma: PrismaClient;
const forceTurso = process.env.TURSO_FORCE === "true";

console.log("Initializing prisma client");
if (process.env.NODE_ENV !== "production" && !forceTurso) {
  console.log("Falling back to local prisma client");
  prisma = new PrismaClient();
} else {
  console.log("Initializing libsql client", {
    url: process.env.TURSO_DATABASE_URL,
  });
  const libsql = createClient({
    url: `${process.env.TURSO_DATABASE_URL}`,
    authToken: `${process.env.TURSO_AUTH_TOKEN}`,
  });

  const adapter = new PrismaLibSQL(libsql);
  prisma = new PrismaClient({ adapter });
}

export { prisma };
