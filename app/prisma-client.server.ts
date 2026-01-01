import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const prismaClientPath = join(__dirname, "generated", "prisma");
const prismaModule = require(prismaClientPath);

export const {
  PrismaClient,
  Prisma,
  prismaVersion,
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  Decimal,
  sql,
  empty,
  join: prismaJoin,
  raw,
  skip,
} = prismaModule;

// Re-export types from generated client
export type * from "./generated/prisma/index.js";
