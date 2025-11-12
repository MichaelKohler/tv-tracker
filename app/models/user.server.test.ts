import { compare } from "bcrypt";

import { prisma } from "../__mocks__/db.server";
import {
  changePassword,
  createUser,
  deleteUserByEmail,
  deleteUserByUserId,
  getUserByEmail,
  getUserById,
  getUserByPlexToken,
  getUserCount,
  verifyLogin,
} from "./user.server";

vi.mock("bcrypt", async () => ({
  ...vi.importActual("bcrypt"),
  compare: vi.fn().mockResolvedValue(true),
  hash: vi.fn().mockResolvedValue("testHash"),
}));

vi.mock("crypto", async () => ({
  ...vi.importActual("crypto"),
  default: {
    createHash: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnValue({
        digest: vi.fn().mockReturnValue("testHashedToken"),
      }),
    }),
  },
}));

vi.mock("../db.server");

describe("User Model", () => {
  beforeEach(() => {
    // Only clearing mocks here, as otherwise we would need to re-mock
    // all the crypto functions again and we'd need to provide all necessary
    // properties to fulfill type checking.
    vi.clearAllMocks();
  });

  it("getUserById should return user", async () => {
    const now = new Date();
    prisma.user.findUnique.mockResolvedValue({
      id: "123",
      createdAt: now,
      updatedAt: now,
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
    });
    const user = await getUserById("123");
    expect(user).toStrictEqual({
      id: "123",
      createdAt: now,
      updatedAt: now,
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
    });
  });

  it("getUserByEmail should return user", async () => {
    const now = new Date();
    prisma.user.findUnique.mockResolvedValue({
      id: "123",
      createdAt: now,
      updatedAt: now,
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
    });
    const user = await getUserByEmail("foo@example.com");
    expect(user).toStrictEqual({
      id: "123",
      createdAt: now,
      updatedAt: now,
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
    });
  });

  it("createUser should create user", async () => {
    await createUser("foo@example.com", "foo");
    expect(prisma.user.create).toBeCalledWith({
      data: {
        email: "foo@example.com",
        password: {
          create: {
            hash: "testHash",
          },
        },
      },
    });
  });

  it("deleteUserByEmail should delete user", async () => {
    await deleteUserByEmail("foo@example.com");
    expect(prisma.user.delete).toBeCalledWith({
      where: {
        email: "foo@example.com",
      },
    });
  });

  it("deleteUserByUserId should delete user", async () => {
    await deleteUserByUserId("1");
    expect(prisma.user.delete).toBeCalledWith({
      where: {
        id: "1",
      },
    });
  });

  it("verifyLogin should return user without password if correct", async () => {
    const now = new Date();
    prisma.user.findUnique.mockResolvedValue({
      id: "123",
      createdAt: now,
      updatedAt: now,
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
      // @ts-expect-error ... the password is an include and therefore we don't have the type for it..
      password: {
        hash: "foo",
      },
    });
    // @ts-expect-error .. compare does return a promise that resolves to a boolean..
    vi.mocked(compare).mockResolvedValue(true);

    const user = await verifyLogin("foo@example.com", "foo");
    expect(user).toStrictEqual({
      id: "123",
      createdAt: now,
      updatedAt: now,
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
    });
  });

  it("verifyLogin should return null if no user found", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const user = await verifyLogin("foo@example.com", "foo");
    expect(user).toBeNull();
  });

  it("verifyLogin should return null if user password found", async () => {
    const now = new Date();
    prisma.user.findUnique.mockResolvedValue({
      id: "123",
      createdAt: now,
      updatedAt: now,
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
    });

    const user = await verifyLogin("foo@example.com", "foo");
    expect(user).toBeNull();
  });

  it("verifyLogin should return null if password is invalid", async () => {
    const now = new Date();
    prisma.user.findUnique.mockResolvedValue({
      id: "123",
      createdAt: now,
      updatedAt: now,
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
      // @ts-expect-error ... the password is an include and therefore we don't have the type for it..
      password: {
        hash: "foo",
      },
    });
    // @ts-expect-error .. compare does return a promise that resolves to a boolean..
    vi.mocked(compare).mockResolvedValue(false);

    const user = await verifyLogin("foo@example.com", "foo");
    expect(user).toBeNull();
  });

  it("getUserCount should return user count", async () => {
    prisma.user.count.mockResolvedValue(2);
    const count = await getUserCount();
    expect(count).toBe(2);
  });

  it("changePassword should throw error if no email or token passed", async () => {
    await expect(() => changePassword("", "foo", "")).rejects.toThrowError(
      "NO_EMAIL_OR_TOKEN_PASSED"
    );
  });

  it("changePassword should change password if email and password", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "123",
      createdAt: new Date(),
      updatedAt: new Date(),
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
    });
    await changePassword("foo@example.com", "foo", "");
    expect(prisma.password.update).toBeCalledWith({
      where: {
        userId: "123",
      },
      data: {
        hash: "testHash",
      },
    });
  });

  it("changePassword should throw error if no user found", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(() =>
      changePassword("foo@example.com", "foo", "")
    ).rejects.toThrowError("USER_NOT_FOUND");
  });

  it("changePassword should throw error if no token reset found", async () => {
    prisma.passwordReset.findUnique.mockResolvedValue(null);
    await expect(() =>
      changePassword("", "foo", "someToken")
    ).rejects.toThrowError("PASSWORD_RESET_EXPIRED");
  });

  it("changePassword should throw error if token reset expired", async () => {
    prisma.passwordReset.findUnique.mockResolvedValue({
      id: "1",
      token: "1",
      createdAt: new Date("1111-01-01"),
      email: "foo@example.com",
    });
    await expect(() =>
      changePassword("", "foo", "someToken")
    ).rejects.toThrowError("PASSWORD_RESET_EXPIRED");
  });

  it("changePassword should change password with reset token", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "123",
      createdAt: new Date(),
      updatedAt: new Date(),
      email: "foo@example.com",
      plexToken: "e4fe1d61-ab49-4e08-ace4-bc070821e9b1",
    });
    prisma.passwordReset.findUnique.mockResolvedValue({
      id: "1",
      token: "1",
      createdAt: new Date(),
      email: "foo@example.com",
    });

    await changePassword("foo@example.com", "foo", "fooToken");
    expect(prisma.password.update).toBeCalledWith({
      where: {
        userId: "123",
      },
      data: {
        hash: "testHash",
      },
    });
    expect(prisma.passwordReset.delete).toBeCalledWith({
      where: {
        token: "testHashedToken",
      },
    });
  });

  it("getUserByPlexToken should return user when valid token provided", async () => {
    const now = new Date();
    prisma.user.findUnique.mockResolvedValue({
      id: "123",
      createdAt: now,
      updatedAt: now,
      email: "foo@example.com",
      plexToken: "test-plex-token",
    });
    const user = await getUserByPlexToken("test-plex-token");
    expect(user).toStrictEqual({
      id: "123",
      createdAt: now,
      updatedAt: now,
      email: "foo@example.com",
      plexToken: "test-plex-token",
    });
  });

  it("getUserByPlexToken should return null when no token provided", async () => {
    const user = await getUserByPlexToken("");
    expect(user).toBeNull();
    expect(prisma.user.findUnique).not.toBeCalled();
  });
});
