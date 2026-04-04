import { beforeEach } from "vite-plus/test";
import { mockDeep, mockReset } from "vitest-mock-extended";

import { PrismaClient } from "../prisma-client.server.js";

const prisma = mockDeep<InstanceType<typeof PrismaClient>>();

beforeEach(() => {
  mockReset(prisma);
});

export { prisma };
