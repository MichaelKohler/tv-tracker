import bcrypt from "@node-rs/bcrypt";
// eslint-disable-next-line jest/no-mocks-import
import { prisma } from "../__mocks__/db.server";
import {
  changePassword,
  createUser,
  deleteUserByEmail,
  deleteUserByUserId,
  getUserByEmail,
  getUserById,
  getUserCount,
  verifyLogin,
} from "./user.server";

vi.mock("../db.server");
vi.mock("@node-rs/bcrypt", async () => {
  return {
    default: {
      compare: vi.fn(),
      hash: vi.fn().mockResolvedValue("testHash"),
    },
  };
});
vi.mock("crypto", async () => {
  return {
    default: {
      createHash: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          digest: vi.fn().mockReturnValue("testHashedToken"),
        }),
      }),
    },
  };
});

test("getUserById should return user", async () => {
  const now = new Date();
  prisma.user.findUnique.mockResolvedValue({
    id: "123",
    createdAt: now,
    updatedAt: now,
    email: "foo@example.com",
  });
  const user = await getUserById("123");
  expect(user).toStrictEqual({
    id: "123",
    createdAt: now,
    updatedAt: now,
    email: "foo@example.com",
  });
});

test("getUserByEmail should return user", async () => {
  const now = new Date();
  prisma.user.findUnique.mockResolvedValue({
    id: "123",
    createdAt: now,
    updatedAt: now,
    email: "foo@example.com",
  });
  const user = await getUserByEmail("foo@example.com");
  expect(user).toStrictEqual({
    id: "123",
    createdAt: now,
    updatedAt: now,
    email: "foo@example.com",
  });
});

test("createUser should create user", async () => {
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

test("deleteUserByEmail should delete user", async () => {
  await deleteUserByEmail("foo@example.com");
  expect(prisma.user.delete).toBeCalledWith({
    where: {
      email: "foo@example.com",
    },
  });
});

test("deleteUserByUserId should delete user", async () => {
  await deleteUserByUserId("1");
  expect(prisma.user.delete).toBeCalledWith({
    where: {
      id: "1",
    },
  });
});

test("verifyLogin should return user without password if correct", async () => {
  const now = new Date();
  prisma.user.findUnique.mockResolvedValue({
    id: "123",
    createdAt: now,
    updatedAt: now,
    email: "foo@example.com",
    // @ts-expect-error ... the password is an include and therefore we don't have the type for it..
    password: {
      hash: "foo",
    },
  });
  vi.mocked(bcrypt.compare).mockResolvedValue(true);

  const user = await verifyLogin("foo@example.com", "foo");
  expect(user).toStrictEqual({
    id: "123",
    createdAt: now,
    updatedAt: now,
    email: "foo@example.com",
  });
});

test("verifyLogin should return null if no user found", async () => {
  prisma.user.findUnique.mockResolvedValue(null);

  const user = await verifyLogin("foo@example.com", "foo");
  expect(user).toBeNull();
});

test("verifyLogin should return null if user password found", async () => {
  const now = new Date();
  prisma.user.findUnique.mockResolvedValue({
    id: "123",
    createdAt: now,
    updatedAt: now,
    email: "foo@example.com",
  });

  const user = await verifyLogin("foo@example.com", "foo");
  expect(user).toBeNull();
});

test("verifyLogin should return null if password is invalid", async () => {
  const now = new Date();
  prisma.user.findUnique.mockResolvedValue({
    id: "123",
    createdAt: now,
    updatedAt: now,
    email: "foo@example.com",
    // @ts-expect-error ... the password is an include and therefore we don't have the type for it..
    password: {
      hash: "foo",
    },
  });
  vi.mocked(bcrypt.compare).mockResolvedValue(false);

  const user = await verifyLogin("foo@example.com", "foo");
  expect(user).toBeNull();
});

test("getUserCount should return user count", async () => {
  prisma.user.count.mockResolvedValue(2);
  const count = await getUserCount();
  expect(count).toBe(2);
});

test("changePassword should throw error if no email or token passed", async () => {
  await expect(() => changePassword("", "foo", "")).rejects.toThrowError(
    "NO_EMAIL_OR_TOKEN_PASSED"
  );
});

test("changePassword should change password if email and password", async () => {
  prisma.user.findUnique.mockResolvedValue({
    id: "123",
    createdAt: new Date(),
    updatedAt: new Date(),
    email: "foo@example.com",
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

test("changePassword should throw error if no user found", async () => {
  prisma.user.findUnique.mockResolvedValue(null);
  await expect(() =>
    changePassword("foo@example.com", "foo", "")
  ).rejects.toThrowError("USER_NOT_FOUND");
});

test("changePassword should throw error if no token reset found", async () => {
  prisma.passwordReset.findUnique.mockResolvedValue(null);
  await expect(() =>
    changePassword("", "foo", "someToken")
  ).rejects.toThrowError("PASSWORD_RESET_EXPIRED");
});

test("changePassword should throw error if token reset expired", async () => {
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

test("changePassword should change password with reset token", async () => {
  prisma.user.findUnique.mockResolvedValue({
    id: "123",
    createdAt: new Date(),
    updatedAt: new Date(),
    email: "foo@example.com",
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
