import type { ActionFunctionArgs } from "react-router";
import type { Passkey } from "@prisma/client";
import type { VerifiedRegistrationResponse } from "@simplewebauthn/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

import {
  clearPasskeyChallenge,
  clearPasskeyReauthChallenge,
  getPasskeyChallenge,
  getPasskeyReauthChallenge,
  requireUser,
  sessionStorage,
} from "../session.server";
import {
  createPasskey,
  verifyPasskeyAuthentication,
} from "../models/passkey.server";
import { userHasPassword, verifyLogin } from "../models/user.server";
import type { User } from "../models/user.server";
import { action } from "./passkey.register-verify";
import { sendPasskeyCreatedMail } from "../models/mail.server";

vi.mock("../db.server");

vi.mock("@simplewebauthn/server", async () => ({
  ...(await vi.importActual("@simplewebauthn/server")),
  verifyRegistrationResponse:
    vi.fn<() => Promise<VerifiedRegistrationResponse>>(),
}));

vi.mock("../models/passkey.server", async () => ({
  ...(await vi.importActual("../models/passkey.server")),
  createPasskey: vi.fn<() => Promise<Passkey>>(),
  verifyPasskeyAuthentication:
    vi.fn<() => Promise<{ success: boolean; error?: string }>>(),
}));

vi.mock("../models/user.server", () => ({
  userHasPassword: vi.fn<() => Promise<boolean>>(),
  verifyLogin: vi.fn<() => Promise<User | null>>(),
}));

vi.mock("../models/mail.server", () => ({
  sendPasskeyCreatedMail: vi.fn<() => Promise<void>>(),
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  requireUser: vi.fn<() => Promise<User>>(),
  getPasskeyChallenge: vi.fn<() => Promise<string | undefined>>(),
  getPasskeyReauthChallenge: vi.fn<() => Promise<string | undefined>>(),
  clearPasskeyChallenge: vi.fn<() => Promise<unknown>>(),
  clearPasskeyReauthChallenge: vi.fn<() => Promise<unknown>>(),
  sessionStorage: {
    commitSession: vi.fn<() => Promise<string>>(),
  },
}));

describe("Passkey Register Verify Route", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    plexToken: "plex-token",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue(mockUser);
    vi.mocked(userHasPassword).mockResolvedValue(true);
    vi.mocked(verifyLogin).mockResolvedValue(mockUser);
    process.env.RP_ORIGIN = "http://localhost:5173";
    process.env.RP_ID = "localhost";
  });

  it("should return error if no challenge found", async () => {
    vi.mocked(getPasskeyChallenge).mockResolvedValue(undefined);

    const request = new Request(
      "http://localhost:3000/passkey/register-verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: {},
          name: "My Passkey",
          password: "correctPassword",
        }),
      }
    );

    const response = await action({
      request,
    } as ActionFunctionArgs);

    expect(response.data).toEqual({ error: "No challenge found" });
  });

  it("should return error if name is missing", async () => {
    vi.mocked(getPasskeyChallenge).mockResolvedValue("test-challenge");

    const request = new Request(
      "http://localhost:3000/passkey/register-verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: {},
          name: "",
          password: "correctPassword",
        }),
      }
    );

    const response = await action({
      request,
    } as ActionFunctionArgs);

    expect(response.data).toEqual({ error: "Passkey name is required" });
  });

  it("should return error if name is not a string", async () => {
    vi.mocked(getPasskeyChallenge).mockResolvedValue("test-challenge");

    const request = new Request(
      "http://localhost:3000/passkey/register-verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: {},
          name: 123,
          password: "correctPassword",
        }),
      }
    );

    const response = await action({
      request,
    } as ActionFunctionArgs);

    expect(response.data).toEqual({ error: "Passkey name is required" });
  });

  describe("password re-authentication (user has password)", () => {
    it("should return error if password is missing", async () => {
      vi.mocked(getPasskeyChallenge).mockResolvedValue("test-challenge");
      vi.mocked(userHasPassword).mockResolvedValue(true);

      const request = new Request(
        "http://localhost:3000/passkey/register-verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: {},
            name: "My Passkey",
          }),
        }
      );

      const response = await action({ request } as ActionFunctionArgs);

      expect(response.data).toEqual({
        error: "Password is required to register a new passkey",
      });
    });

    it("should return error if password is empty string", async () => {
      vi.mocked(getPasskeyChallenge).mockResolvedValue("test-challenge");
      vi.mocked(userHasPassword).mockResolvedValue(true);

      const request = new Request(
        "http://localhost:3000/passkey/register-verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: {},
            name: "My Passkey",
            password: "",
          }),
        }
      );

      const response = await action({ request } as ActionFunctionArgs);

      expect(response.data).toEqual({
        error: "Password is required to register a new passkey",
      });
    });

    it("should return 401 if password is incorrect", async () => {
      vi.mocked(getPasskeyChallenge).mockResolvedValue("test-challenge");
      vi.mocked(userHasPassword).mockResolvedValue(true);
      vi.mocked(verifyLogin).mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/passkey/register-verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: {},
            name: "My Passkey",
            password: "wrongPassword",
          }),
        }
      );

      const response = await action({ request } as ActionFunctionArgs);

      expect(response.data).toEqual({ error: "Incorrect password" });
    });
  });

  describe("passkey re-authentication (user has no password)", () => {
    it("should return error if passkeyCredential is missing", async () => {
      vi.mocked(getPasskeyChallenge).mockResolvedValue("test-challenge");
      vi.mocked(userHasPassword).mockResolvedValue(false);

      const request = new Request(
        "http://localhost:3000/passkey/register-verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: {},
            name: "My Passkey",
          }),
        }
      );

      const response = await action({ request } as ActionFunctionArgs);

      expect(response.data).toEqual({
        error: "Passkey authentication is required to register a new passkey",
      });
    });

    it("should return error if no reauth challenge in session", async () => {
      vi.mocked(getPasskeyChallenge).mockResolvedValue("test-challenge");
      vi.mocked(userHasPassword).mockResolvedValue(false);
      vi.mocked(getPasskeyReauthChallenge).mockResolvedValue(undefined);

      const request = new Request(
        "http://localhost:3000/passkey/register-verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: {},
            name: "My Passkey",
            passkeyCredential: { id: "cred-1", type: "public-key" },
          }),
        }
      );

      const response = await action({ request } as ActionFunctionArgs);

      expect(response.data).toEqual({
        error: "No authentication challenge found. Please try again.",
      });
    });

    it("should return error if passkey reauth fails", async () => {
      vi.mocked(getPasskeyChallenge).mockResolvedValue("test-challenge");
      vi.mocked(userHasPassword).mockResolvedValue(false);
      vi.mocked(getPasskeyReauthChallenge).mockResolvedValue(
        "reauth-challenge"
      );
      vi.mocked(verifyPasskeyAuthentication).mockResolvedValue({
        success: false,
        error: "Verification failed",
      });

      const request = new Request(
        "http://localhost:3000/passkey/register-verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: {},
            name: "My Passkey",
            passkeyCredential: { id: "cred-1", type: "public-key" },
          }),
        }
      );

      const response = await action({ request } as ActionFunctionArgs);

      expect(response.data).toEqual({ error: "Verification failed" });
    });
  });

  it("should return error if registration verification fails", async () => {
    vi.mocked(getPasskeyChallenge).mockResolvedValue("test-challenge");
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: false,
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      registrationInfo: undefined as any,
    });

    const request = new Request(
      "http://localhost:3000/passkey/register-verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: { id: "cred-123" },
          name: "My Passkey",
          password: "correctPassword",
        }),
      }
    );

    const response = await action({
      request,
    } as ActionFunctionArgs);

    expect(response.data).toEqual({ error: "Verification failed" });
  });

  it("should create passkey and return success on valid verification with password", async () => {
    const mockChallenge = "test-challenge-abc";
    const mockSession = { id: "session-123" };
    const mockCredential = {
      id: "cred-123",
      rawId: "cred-123",
      response: {},
      type: "public-key",
    };

    const mockRegistrationInfo = {
      credential: {
        id: "cred-abc-123",
        publicKey: new Uint8Array([1, 2, 3, 4, 5]),
        counter: 0,
        transports: ["usb", "nfc"],
      },
      credentialDeviceType: "singleDevice",
      credentialBackedUp: false,
    };

    const mockCreatedAt = new Date("2025-01-01T12:00:00Z");

    vi.mocked(getPasskeyChallenge).mockResolvedValue(mockChallenge);
    vi.mocked(userHasPassword).mockResolvedValue(true);
    vi.mocked(verifyLogin).mockResolvedValue(mockUser);
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      registrationInfo: mockRegistrationInfo as any,
    });
    vi.mocked(createPasskey).mockResolvedValue({
      id: "passkey-1",
      userId: "user-123",
      credentialId: "cred-abc-123",
      publicKey: Buffer.from([1, 2, 3, 4, 5]),
      counter: BigInt(0),
      transports: ["usb", "nfc"],
      name: "My YubiKey",
      createdAt: mockCreatedAt,
      updatedAt: new Date(),
      lastUsedAt: new Date(),
    });
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clearPasskeyChallenge).mockResolvedValue(mockSession as any);
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clearPasskeyReauthChallenge).mockResolvedValue(
      mockSession as any
    );
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

    const request = new Request(
      "http://localhost:3000/passkey/register-verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: mockCredential,
          name: "My YubiKey",
          password: "correctPassword",
        }),
      }
    );

    const response = await action({
      request,
    } as ActionFunctionArgs);

    expect(verifyLogin).toHaveBeenCalledWith(
      "test@example.com",
      "correctPassword"
    );
    expect(createPasskey).toHaveBeenCalledWith({
      userId: "user-123",
      credentialId: "cred-abc-123",
      publicKey: new Uint8Array([1, 2, 3, 4, 5]),
      counter: BigInt(0),
      transports: ["usb", "nfc"],
      name: "My YubiKey",
    });
    expect(sendPasskeyCreatedMail).toHaveBeenCalledWith({
      email: "test@example.com",
      passkeyName: "My YubiKey",
      createdAt: mockCreatedAt,
    });
    expect(response.data).toEqual({ verified: true });
  });

  it("should create passkey and return success for passkey-only user with valid reauth", async () => {
    const mockChallenge = "test-challenge-abc";
    const mockReauthChallenge = "reauth-challenge-xyz";
    const mockSession = { id: "session-123" };
    const mockPasskeyCredential = { id: "existing-cred", type: "public-key" };

    const mockRegistrationInfo = {
      credential: {
        id: "new-cred-123",
        publicKey: new Uint8Array([1, 2, 3]),
        counter: 0,
        transports: ["internal"],
      },
    };

    const mockCreatedAt = new Date("2025-01-01T12:00:00Z");

    vi.mocked(getPasskeyChallenge).mockResolvedValue(mockChallenge);
    vi.mocked(userHasPassword).mockResolvedValue(false);
    vi.mocked(getPasskeyReauthChallenge).mockResolvedValue(mockReauthChallenge);
    vi.mocked(verifyPasskeyAuthentication).mockResolvedValue({ success: true });
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      registrationInfo: mockRegistrationInfo as any,
    });
    vi.mocked(createPasskey).mockResolvedValue({
      id: "new-passkey",
      userId: "user-123",
      credentialId: "new-cred-123",
      publicKey: Buffer.from([1, 2, 3]),
      counter: BigInt(0),
      transports: ["internal"],
      name: "New Passkey",
      createdAt: mockCreatedAt,
      updatedAt: new Date(),
      lastUsedAt: new Date(),
    });
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clearPasskeyChallenge).mockResolvedValue(mockSession as any);
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clearPasskeyReauthChallenge).mockResolvedValue(
      mockSession as any
    );
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

    const request = new Request(
      "http://localhost:3000/passkey/register-verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: { id: "new-cred-123" },
          name: "New Passkey",
          passkeyCredential: mockPasskeyCredential,
        }),
      }
    );

    const response = await action({ request } as ActionFunctionArgs);

    expect(verifyPasskeyAuthentication).toHaveBeenCalledWith(
      mockPasskeyCredential,
      mockReauthChallenge,
      "user-123"
    );
    expect(response.data).toEqual({ verified: true });
  });

  it("should trim whitespace from passkey name", async () => {
    const mockChallenge = "test-challenge";
    const mockSession = { id: "session-123" };

    const mockRegistrationInfo = {
      credential: {
        id: "cred-123",
        publicKey: new Uint8Array([1, 2, 3]),
        counter: 0,
        transports: [],
      },
    };

    vi.mocked(getPasskeyChallenge).mockResolvedValue(mockChallenge);
    vi.mocked(userHasPassword).mockResolvedValue(true);
    vi.mocked(verifyLogin).mockResolvedValue(mockUser);
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      registrationInfo: mockRegistrationInfo as any,
    });
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clearPasskeyChallenge).mockResolvedValue(mockSession as any);
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clearPasskeyReauthChallenge).mockResolvedValue(
      mockSession as any
    );
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

    const request = new Request(
      "http://localhost:3000/passkey/register-verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: {},
          name: "  My iPhone  ",
          password: "correctPassword",
        }),
      }
    );

    await action({ request } as ActionFunctionArgs);

    expect(createPasskey).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "My iPhone",
      })
    );
  });

  it("should handle verification errors gracefully", async () => {
    vi.mocked(getPasskeyChallenge).mockResolvedValue("test-challenge");
    vi.mocked(userHasPassword).mockResolvedValue(true);
    vi.mocked(verifyLogin).mockResolvedValue(mockUser);
    vi.mocked(verifyRegistrationResponse).mockRejectedValue(
      new Error("Verification error")
    );

    const request = new Request(
      "http://localhost:3000/passkey/register-verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: {},
          name: "My Passkey",
          password: "correctPassword",
        }),
      }
    );

    const response = await action({
      request,
    } as ActionFunctionArgs);

    expect(response.data).toEqual({ error: "Failed to verify passkey" });
  });

  it("should use environment variables for origin and RP ID", async () => {
    process.env.RP_ORIGIN = "https://example.com";
    process.env.RP_ID = "example.com";

    const mockChallenge = "test-challenge";
    const mockSession = { id: "session-123" };

    vi.mocked(getPasskeyChallenge).mockResolvedValue(mockChallenge);
    vi.mocked(userHasPassword).mockResolvedValue(true);
    vi.mocked(verifyLogin).mockResolvedValue(mockUser);
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "cred-123",
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
          transports: [],
        },
        // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clearPasskeyChallenge).mockResolvedValue(mockSession as any);
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clearPasskeyReauthChallenge).mockResolvedValue(
      mockSession as any
    );
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

    const request = new Request(
      "http://localhost:3000/passkey/register-verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: {},
          name: "My Passkey",
          password: "correctPassword",
        }),
      }
    );

    await action({ request } as ActionFunctionArgs);

    expect(verifyRegistrationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedOrigin: "https://example.com",
        expectedRPID: "example.com",
      })
    );
  });
});
