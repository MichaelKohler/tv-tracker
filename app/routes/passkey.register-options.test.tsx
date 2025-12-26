import type { LoaderFunctionArgs } from "react-router";
import { generateRegistrationOptions } from "@simplewebauthn/server";

import { getPasskeysByUserId } from "../models/passkey.server";
import {
  requireUser,
  sessionStorage,
  setPasskeyChallenge,
} from "../session.server";
import { loader } from "./passkey.register-options";

vi.mock("@simplewebauthn/server", async () => ({
  ...(await vi.importActual("@simplewebauthn/server")),
  generateRegistrationOptions: vi.fn(),
}));

vi.mock("../models/passkey.server", async () => ({
  ...(await vi.importActual("../models/passkey.server")),
  getPasskeysByUserId: vi.fn(),
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  requireUser: vi.fn(),
  sessionStorage: {
    commitSession: vi.fn(),
  },
  setPasskeyChallenge: vi.fn(),
}));

describe("Passkey Register Options Route", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    plexToken: "plex-token",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest = new Request(
    "http://localhost:3000/passkey/register-options"
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue(mockUser);

    process.env.RP_NAME = "TV Tracker";
    process.env.RP_ID = "localhost";
  });

  it("should return registration options for user with no passkeys", async () => {
    const mockSession = { id: "session-123" };
    const mockOptions = {
      challenge: "test-challenge-123",
      rp: { name: "TV Tracker", id: "localhost" },
      user: {
        id: "user-123",
        name: "test@example.com",
        displayName: "test@example.com",
      },
    };

    vi.mocked(getPasskeysByUserId).mockResolvedValue([]);
    vi.mocked(generateRegistrationOptions).mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockOptions as any
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(setPasskeyChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

    const response = await loader({
      request: mockRequest,
    } as LoaderFunctionArgs);

    const data = response.data;

    expect(requireUser).toHaveBeenCalledWith(mockRequest);
    expect(getPasskeysByUserId).toHaveBeenCalledWith("user-123");
    expect(generateRegistrationOptions).toHaveBeenCalledWith({
      rpName: "TV Tracker",
      rpID: "localhost",
      userName: "test@example.com",
      userDisplayName: "test@example.com",
      attestationType: "none",
      excludeCredentials: [],
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });
    expect(setPasskeyChallenge).toHaveBeenCalledWith(
      mockRequest,
      "test-challenge-123"
    );
    expect(data).toEqual(mockOptions);
  });

  it("should exclude existing passkeys from registration", async () => {
    const mockSession = { id: "session-123" };
    const mockExistingPasskeys = [
      {
        id: "passkey-1",
        userId: "user-123",
        credentialId: "cred-1",
        publicKey: Buffer.from("key-1"),
        counter: BigInt(0),
        transports: ["usb", "nfc"],
        name: "YubiKey",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: new Date(),
      },
      {
        id: "passkey-2",
        userId: "user-123",
        credentialId: "cred-2",
        publicKey: Buffer.from("key-2"),
        counter: BigInt(0),
        transports: ["internal"],
        name: "iPhone",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUsedAt: new Date(),
      },
    ];

    const mockOptions = {
      challenge: "test-challenge-456",
      rp: { name: "TV Tracker", id: "localhost" },
      user: {
        id: "user-123",
        name: "test@example.com",
        displayName: "test@example.com",
      },
    };

    vi.mocked(getPasskeysByUserId).mockResolvedValue(mockExistingPasskeys);
    vi.mocked(generateRegistrationOptions).mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockOptions as any
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(setPasskeyChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

    await loader({ request: mockRequest } as LoaderFunctionArgs);

    expect(generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeCredentials: [
          { id: "cred-1", transports: ["usb", "nfc"] },
          { id: "cred-2", transports: ["internal"] },
        ],
      })
    );
  });

  it("should use environment variables for RP configuration", async () => {
    process.env.RP_NAME = "Custom App";
    process.env.RP_ID = "example.com";

    const mockSession = { id: "session-123" };
    const mockOptions = { challenge: "test-challenge" };

    vi.mocked(getPasskeysByUserId).mockResolvedValue([]);
    vi.mocked(generateRegistrationOptions).mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockOptions as any
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(setPasskeyChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

    await loader({ request: mockRequest } as LoaderFunctionArgs);

    expect(generateRegistrationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        rpName: "Custom App",
        rpID: "example.com",
      })
    );
  });

  it("should call sessionStorage.commitSession", async () => {
    const mockSession = { id: "session-123" };
    const mockOptions = { challenge: "test-challenge" };

    vi.mocked(getPasskeysByUserId).mockResolvedValue([]);
    vi.mocked(generateRegistrationOptions).mockResolvedValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockOptions as any
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(setPasskeyChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(sessionStorage.commitSession).mockResolvedValue(
      "session-cookie-value"
    );

    await loader({
      request: mockRequest,
    } as LoaderFunctionArgs);

    expect(sessionStorage.commitSession).toHaveBeenCalledWith(mockSession);
  });
});
