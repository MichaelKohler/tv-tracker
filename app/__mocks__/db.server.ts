import { beforeEach } from "vite-plus/test";
import { mockDeep, mockReset } from "vitest-mock-extended";

import { PrismaClient } from "../prisma-client.server.js";

beforeEach(() => {
  mockReset(prisma);
});

const prisma = mockDeep<InstanceType<typeof PrismaClient>>();
export { prisma };
