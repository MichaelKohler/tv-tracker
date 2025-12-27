import { prisma } from "../__mocks__/db.server";
import {
  createPasskey,
  deletePasskey,
  getPasskeysByUserId,
  updatePasskeyCounter,
  updatePasskeyName,
} from "./passkey.server";

vi.mock("../db.server");

describe("Passkey Model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPasskeysByUserId", () => {
    it("should return passkeys for user", async () => {
      const now = new Date();
      const mockPasskeys = [
        {
          id: "passkey-1",
          userId: "user-123",
          credentialId: "cred-1",
          publicKey: Buffer.from("public-key-1"),
          counter: BigInt(0),
          transports: ["usb"],
          name: "YubiKey",
          createdAt: now,
          updatedAt: now,
          lastUsedAt: now,
        },
        {
          id: "passkey-2",
          userId: "user-123",
          credentialId: "cred-2",
          publicKey: Buffer.from("public-key-2"),
          counter: BigInt(0),
          transports: ["internal"],
          name: "iPhone",
          createdAt: now,
          updatedAt: now,
          lastUsedAt: now,
        },
      ];

      prisma.passkey.findMany.mockResolvedValue(mockPasskeys);

      const result = await getPasskeysByUserId("user-123");

      expect(result).toEqual(mockPasskeys);
      expect(prisma.passkey.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty array when user has no passkeys", async () => {
      prisma.passkey.findMany.mockResolvedValue([]);

      const result = await getPasskeysByUserId("user-456");

      expect(result).toEqual([]);
      expect(prisma.passkey.findMany).toHaveBeenCalledWith({
        where: { userId: "user-456" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("createPasskey", () => {
    it("should create passkey with correct data", async () => {
      const now = new Date();
      const publicKey = new Uint8Array([1, 2, 3, 4, 5]);
      const mockPasskey = {
        id: "passkey-1",
        userId: "user-123",
        credentialId: "cred-abc",
        publicKey: Buffer.from(publicKey),
        counter: BigInt(0),
        transports: ["usb", "nfc"],
        name: "My YubiKey",
        createdAt: now,
        updatedAt: now,
        lastUsedAt: now,
      };

      prisma.passkey.create.mockResolvedValue(mockPasskey);

      const result = await createPasskey({
        userId: "user-123",
        credentialId: "cred-abc",
        publicKey,
        counter: BigInt(0),
        transports: ["usb", "nfc"],
        name: "My YubiKey",
      });

      expect(result).toEqual(mockPasskey);
      expect(prisma.passkey.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          credentialId: "cred-abc",
          publicKey: Buffer.from(publicKey),
          counter: BigInt(0),
          transports: ["usb", "nfc"],
          name: "My YubiKey",
        },
      });
    });
  });

  describe("updatePasskeyCounter", () => {
    it("should update counter and lastUsedAt", async () => {
      const now = new Date();
      const mockUpdatedPasskey = {
        id: "passkey-1",
        userId: "user-123",
        credentialId: "cred-abc",
        publicKey: Buffer.from("public-key"),
        counter: BigInt(10),
        transports: ["usb"],
        name: "YubiKey",
        createdAt: now,
        updatedAt: now,
        lastUsedAt: now,
      };

      prisma.passkey.update.mockResolvedValue(mockUpdatedPasskey);

      const result = await updatePasskeyCounter("passkey-1", BigInt(10));

      expect(result).toEqual(mockUpdatedPasskey);
      expect(prisma.passkey.update).toHaveBeenCalledWith({
        where: { id: "passkey-1" },
        data: {
          counter: BigInt(10),
          lastUsedAt: expect.any(Date),
        },
      });
    });
  });

  describe("deletePasskey", () => {
    it("should delete passkey with user ownership check", async () => {
      const now = new Date();
      const mockDeletedPasskey = {
        id: "passkey-1",
        userId: "user-123",
        credentialId: "cred-abc",
        publicKey: Buffer.from("public-key"),
        counter: BigInt(5),
        transports: ["usb"],
        name: "YubiKey",
        createdAt: now,
        updatedAt: now,
        lastUsedAt: now,
      };

      prisma.passkey.delete.mockResolvedValue(mockDeletedPasskey);

      const result = await deletePasskey("passkey-1", "user-123");

      expect(result).toEqual(mockDeletedPasskey);
      expect(prisma.passkey.delete).toHaveBeenCalledWith({
        where: {
          id: "passkey-1",
          userId: "user-123",
        },
      });
    });
  });

  describe("updatePasskeyName", () => {
    it("should update passkey name with user ownership check", async () => {
      const now = new Date();
      const mockUpdatedPasskey = {
        id: "passkey-1",
        userId: "user-123",
        credentialId: "cred-abc",
        publicKey: Buffer.from("public-key"),
        counter: BigInt(5),
        transports: ["usb"],
        name: "My Updated YubiKey",
        createdAt: now,
        updatedAt: now,
        lastUsedAt: now,
      };

      prisma.passkey.update.mockResolvedValue(mockUpdatedPasskey);

      const result = await updatePasskeyName(
        "passkey-1",
        "user-123",
        "My Updated YubiKey"
      );

      expect(result).toEqual(mockUpdatedPasskey);
      expect(prisma.passkey.update).toHaveBeenCalledWith({
        where: {
          id: "passkey-1",
          userId: "user-123",
        },
        data: {
          name: "My Updated YubiKey",
        },
      });
    });
  });
});
