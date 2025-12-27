import type { ActionFunctionArgs } from "react-router";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

import {
  getPasskeyByCredentialId,
  updatePasskeyCounter,
} from "../models/passkey.server";
import {
  clearPasskeyChallenge,
  createUserSession,
  getPasskeyChallenge,
} from "../session.server";
import { action } from "./passkey.login-verify";

vi.mock("../db.server");

vi.mock("@simplewebauthn/server", async () => ({
  ...(await vi.importActual("@simplewebauthn/server")),
  verifyAuthenticationResponse: vi.fn(),
}));

vi.mock("../models/passkey.server", async () => ({
  ...(await vi.importActual("../models/passkey.server")),
  getPasskeyByCredentialId: vi.fn(),
  updatePasskeyCounter: vi.fn(),
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  getPasskeyChallenge: vi.fn(),
  clearPasskeyChallenge: vi.fn(),
  createUserSession: vi.fn(),
  sessionStorage: {
    commitSession: vi.fn(),
  },
}));

describe("Passkey Login Verify Route", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    plexToken: "plex-token",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPasskey = {
    id: "passkey-1",
    userId: "user-123",
    credentialId: "cred-123",
    publicKey: Buffer.from([1, 2, 3, 4, 5]),
    counter: BigInt(5),
    transports: ["usb", "nfc"],
    name: "My YubiKey",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUsedAt: new Date(),
    user: mockUser,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RP_ORIGIN = "http://localhost:5173";
    process.env.RP_ID = "localhost";
  });

  it("should return error if no challenge found", async () => {
    vi.mocked(getPasskeyChallenge).mockResolvedValue(undefined);

    const request = new Request("http://localhost:3000/passkey/login-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credential: { id: "cred-123" },
      }),
    });

    const response = await action({
      request,
    } as ActionFunctionArgs);

    // @ts-expect-error : we do not actually have a real response here..
    expect(response.data).toEqual({ error: "No challenge found" });
  });

  it("should return error if credential is missing", async () => {
    vi.mocked(getPasskeyChallenge).mockResolvedValue("test-challenge");

    const request = new Request("http://localhost:3000/passkey/login-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await action({
      request,
    } as ActionFunctionArgs);

    // @ts-expect-error : we do not actually have a real response here..
    expect(response.data).toEqual({ error: "Invalid credential" });
  });

  it("should return error if credential ID is missing", async () => {
    vi.mocked(getPasskeyChallenge).mockResolvedValue("test-challenge");

    const request = new Request("http://localhost:3000/passkey/login-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credential: {},
      }),
    });

    const response = await action({
      request,
    } as ActionFunctionArgs);

    // @ts-expect-error : we do not actually have a real response here..
    expect(response.data).toEqual({ error: "Invalid credential" });
  });

  it("should return error if passkey not found", async () => {
    vi.mocked(getPasskeyChallenge).mockResolvedValue("test-challenge");
    vi.mocked(getPasskeyByCredentialId).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/passkey/login-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credential: { id: "cred-nonexistent" },
      }),
    });

    const response = await action({
      request,
    } as ActionFunctionArgs);

    expect(getPasskeyByCredentialId).toHaveBeenCalledWith("cred-nonexistent");
    // @ts-expect-error : we do not actually have a real response here..
    expect(response.data).toEqual({ error: "Passkey not found" });
  });

  it("should return error if verification fails", async () => {
    vi.mocked(getPasskeyChallenge).mockResolvedValue("test-challenge");
    vi.mocked(getPasskeyByCredentialId).mockResolvedValue(mockPasskey);
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authenticationInfo: {} as any,
    });

    const request = new Request("http://localhost:3000/passkey/login-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credential: { id: "cred-123" },
      }),
    });

    const response = await action({
      request,
    } as ActionFunctionArgs);

    // @ts-expect-error : we do not actually have a real response here..
    expect(response.data).toEqual({ error: "Verification failed" });
  });

  it("should authenticate user and update counter on successful verification", async () => {
    const mockChallenge = "test-challenge-abc";
    const mockSession = { id: "session-123" };
    const mockCredential = {
      id: "cred-123",
      rawId: "cred-123",
      response: {},
      type: "public-key",
    };

    vi.mocked(getPasskeyChallenge).mockResolvedValue(mockChallenge);
    vi.mocked(getPasskeyByCredentialId).mockResolvedValue(mockPasskey);
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: {
        newCounter: 10,
        credentialID: new Uint8Array(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clearPasskeyChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(createUserSession).mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Response.redirect("http://localhost:3000/tv") as any
    );

    const request = new Request("http://localhost:3000/passkey/login-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credential: mockCredential,
        redirectTo: "/tv",
        remember: false,
      }),
    });

    await action({
      request,
    } as ActionFunctionArgs);

    expect(verifyAuthenticationResponse).toHaveBeenCalledWith({
      response: mockCredential,
      expectedChallenge: mockChallenge,
      expectedOrigin: "http://localhost:5173",
      expectedRPID: "localhost",
      credential: {
        id: "cred-123",
        publicKey: new Uint8Array([1, 2, 3, 4, 5]),
        counter: 5,
        transports: ["usb", "nfc"],
      },
    });

    expect(updatePasskeyCounter).toHaveBeenCalledWith("passkey-1", BigInt(10));
    expect(clearPasskeyChallenge).toHaveBeenCalledWith(request);
    expect(createUserSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        remember: false,
        redirectTo: "/tv",
      })
    );
  });

  it("should use remember flag when provided", async () => {
    const mockChallenge = "test-challenge";
    const mockSession = { id: "session-123" };

    vi.mocked(getPasskeyChallenge).mockResolvedValue(mockChallenge);
    vi.mocked(getPasskeyByCredentialId).mockResolvedValue(mockPasskey);
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: {
        newCounter: 6,
        credentialID: new Uint8Array(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clearPasskeyChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(createUserSession).mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Response.redirect("http://localhost:3000/tv") as any
    );

    const request = new Request("http://localhost:3000/passkey/login-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credential: { id: "cred-123" },
        remember: true,
      }),
    });

    await action({ request } as ActionFunctionArgs);

    expect(createUserSession).toHaveBeenCalledWith(
      expect.objectContaining({
        remember: true,
      })
    );
  });

  it("should use default redirectTo when not provided", async () => {
    const mockChallenge = "test-challenge";
    const mockSession = { id: "session-123" };

    vi.mocked(getPasskeyChallenge).mockResolvedValue(mockChallenge);
    vi.mocked(getPasskeyByCredentialId).mockResolvedValue(mockPasskey);
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: {
        newCounter: 6,
        credentialID: new Uint8Array(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clearPasskeyChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(createUserSession).mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Response.redirect("http://localhost:3000/tv") as any
    );

    const request = new Request("http://localhost:3000/passkey/login-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credential: { id: "cred-123" },
      }),
    });

    await action({ request } as ActionFunctionArgs);

    expect(createUserSession).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectTo: "/tv",
      })
    );
  });

  it("should handle verification errors gracefully", async () => {
    vi.mocked(getPasskeyChallenge).mockResolvedValue("test-challenge");
    vi.mocked(getPasskeyByCredentialId).mockResolvedValue(mockPasskey);
    vi.mocked(verifyAuthenticationResponse).mockRejectedValue(
      new Error("Verification error")
    );

    const request = new Request("http://localhost:3000/passkey/login-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credential: { id: "cred-123" },
      }),
    });

    const response = await action({
      request,
    } as ActionFunctionArgs);

    // @ts-expect-error : we do not actually have a real response here..
    expect(response.data).toEqual({ error: "Failed to authenticate passkey" });
  });

  it("should use environment variables for origin and RP ID", async () => {
    process.env.RP_ORIGIN = "https://example.com";
    process.env.RP_ID = "example.com";

    const mockChallenge = "test-challenge";
    const mockSession = { id: "session-123" };

    vi.mocked(getPasskeyChallenge).mockResolvedValue(mockChallenge);
    vi.mocked(getPasskeyByCredentialId).mockResolvedValue(mockPasskey);
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: {
        newCounter: 6,
        credentialID: new Uint8Array(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clearPasskeyChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(createUserSession).mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Response.redirect("http://localhost:3000/tv") as any
    );

    const request = new Request("http://localhost:3000/passkey/login-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credential: { id: "cred-123" },
      }),
    });

    await action({ request } as ActionFunctionArgs);

    expect(verifyAuthenticationResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedOrigin: "https://example.com",
        expectedRPID: "example.com",
      })
    );
  });

  it("should sanitize redirectTo using safeRedirect", async () => {
    const mockChallenge = "test-challenge";
    const mockSession = { id: "session-123" };

    vi.mocked(getPasskeyChallenge).mockResolvedValue(mockChallenge);
    vi.mocked(getPasskeyByCredentialId).mockResolvedValue(mockPasskey);
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: {
        newCounter: 6,
        credentialID: new Uint8Array(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(clearPasskeyChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(createUserSession).mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Response.redirect("http://localhost:3000/tv") as any
    );

    const request = new Request("http://localhost:3000/passkey/login-verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        credential: { id: "cred-123" },
        redirectTo: "https://evil.com",
      }),
    });

    await action({ request } as ActionFunctionArgs);

    // safeRedirect should prevent external redirects
    expect(createUserSession).toHaveBeenCalledWith(
      expect.objectContaining({
        redirectTo: "/tv", // defaults to /tv for unsafe URLs
      })
    );
  });
});
