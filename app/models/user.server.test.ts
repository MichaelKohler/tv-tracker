import { compare } from "bcrypt";

import { prisma } from "../__mocks__/db.server";
import {
  changePassword,
  deleteUserByEmail,
  deleteUserByUserId,
  getUserByEmail,
  getUserById,
  getUserByPlexToken,
  getUserCount,
} from "./user.server";

vi.mock("bcrypt", async () => ({
  ...(await vi.importActual("bcrypt")),
  compare: vi.fn().mockResolvedValue(true),
  hash: vi.fn().mockResolvedValue("testHash"),
}));

vi.mock("crypto", async () => ({
  ...(await vi.importActual("crypto")),
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


  it("getUserCount should return user count", async () => {
    prisma.user.count.mockResolvedValue(2);
    const count = await getUserCount();
    expect(count).toBe(2);
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
