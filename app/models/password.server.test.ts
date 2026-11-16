import { prisma } from "../__mocks__/db.server";
import { triggerPasswordReset } from "./password.server";

vi.mock("../db.server");

describe("triggerPasswordReset", () => {
  beforeEach(() => {
    vi.stubEnv("SMTP_HOST", "");
    prisma.$transaction.mockImplementation(((
      callback: (transaction: typeof prisma) => unknown
    ) => callback(prisma)) as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should replace the user's pending reset links with one bound to the user's id", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "123",
      createdAt: new Date(),
      updatedAt: new Date(),
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
    });

    await triggerPasswordReset("foo@example.com");

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.passwordReset.deleteMany).toHaveBeenCalledWith({
      where: { userId: "123" },
    });
    expect(prisma.passwordReset.create).toHaveBeenCalledWith({
      data: {
        userId: "123",
        token: expect.stringMatching(/^[0-9a-f]{64}$/),
      },
    });
  });

  it("should lock the user before replacing the pending reset links", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "123",
      createdAt: new Date(),
      updatedAt: new Date(),
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
    });

    await triggerPasswordReset("foo@example.com");

    const lockOrder = prisma.$queryRaw.mock.invocationCallOrder[0];
    expect(lockOrder).toBeLessThan(
      prisma.passwordReset.deleteMany.mock.invocationCallOrder[0]
    );
    expect(lockOrder).toBeLessThan(
      prisma.passwordReset.create.mock.invocationCallOrder[0]
    );
  });

  it("should only touch reset links inside the transaction", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "123",
      createdAt: new Date(),
      updatedAt: new Date(),
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
    });
    prisma.$transaction.mockRejectedValue(new Error("db down"));

    await triggerPasswordReset("foo@example.com");

    expect(prisma.passwordReset.deleteMany).not.toHaveBeenCalled();
    expect(prisma.passwordReset.create).not.toHaveBeenCalled();
  });

  it("should not create a reset link when no user has the email", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await triggerPasswordReset("nobody@example.com");

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.passwordReset.deleteMany).not.toHaveBeenCalled();
    expect(prisma.passwordReset.create).not.toHaveBeenCalled();
  });
});
