import type { ActionFunctionArgs } from "react-router";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

import { createPasskey } from "../models/passkey.server";
import {
  clearPasskeyChallenge,
  getPasskeyChallenge,
  requireUser,
  sessionStorage,
} from "../session.server";
import { sendPasskeyCreatedMail } from "../models/mail.server";
import { action } from "./passkey.register-verify";

vi.mock("../db.server");

vi.mock("@simplewebauthn/server", async () => ({
  ...(await vi.importActual("@simplewebauthn/server")),
  verifyRegistrationResponse: vi.fn(),
}));

vi.mock("../models/passkey.server", async () => ({
  ...(await vi.importActual("../models/passkey.server")),
  createPasskey: vi.fn(),
}));

vi.mock("../models/mail.server", async () => ({
  ...(await vi.importActual("../models/mail.server")),
  sendPasskeyCreatedMail: vi.fn(),
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  requireUser: vi.fn(),
  getPasskeyChallenge: vi.fn(),
  clearPasskeyChallenge: vi.fn(),
  sessionStorage: {
    commitSession: vi.fn(),
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
        }),
      }
    );

    const response = await action({
      request,
    } as ActionFunctionArgs);

    expect(response.data).toEqual({ error: "Passkey name is required" });
  });

  it("should return error if verification fails", async () => {
    vi.mocked(getPasskeyChallenge).mockResolvedValue("test-challenge");
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        }),
      }
    );

    const response = await action({
      request,
    } as ActionFunctionArgs);

    expect(response.data).toEqual({ error: "Verification failed" });
  });

  it("should create passkey and return success on valid verification", async () => {
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
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clearPasskeyChallenge).mockResolvedValue(mockSession as any); // Need to cast as session type is complex
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

    const request = new Request(
      "http://localhost:3000/passkey/register-verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: mockCredential,
          name: "My YubiKey",
        }),
      }
    );

    const response = await action({
      request,
    } as ActionFunctionArgs);

    expect(verifyRegistrationResponse).toHaveBeenCalledWith({
      response: mockCredential,
      expectedChallenge: mockChallenge,
      expectedOrigin: "http://localhost:5173",
      expectedRPID: "localhost",
    });

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

    expect(clearPasskeyChallenge).toHaveBeenCalledWith(request);
    expect(response.data).toEqual({ verified: true });
    expect(sessionStorage.commitSession).toHaveBeenCalledWith(mockSession);
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
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      registrationInfo: mockRegistrationInfo as any,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clearPasskeyChallenge).mockResolvedValue(mockSession as any); // Need to cast as session type is complex
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

    const request = new Request(
      "http://localhost:3000/passkey/register-verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential: {},
          name: "  My iPhone  ",
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
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "cred-123",
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
          transports: [],
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clearPasskeyChallenge).mockResolvedValue(mockSession as any); // Need to cast as session type is complex
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

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

    await action({ request } as ActionFunctionArgs);

    expect(verifyRegistrationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedOrigin: "https://example.com",
        expectedRPID: "example.com",
      })
    );
  });
});
