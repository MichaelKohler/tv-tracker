import { mockDeep, mockReset } from "vitest-mock-extended";
import { beforeEach } from "vite-plus/test";

import { PrismaClient } from "../prisma-client.server.js";

const prisma = mockDeep<InstanceType<typeof PrismaClient>>();

beforeEach(() => {
  mockReset(prisma);
});

export { prisma };
