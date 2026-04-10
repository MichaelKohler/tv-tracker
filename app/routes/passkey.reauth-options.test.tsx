import type { LoaderFunctionArgs } from "react-router";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/types";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

import {
  requireUser,
  sessionStorage,
  setPasskeyReauthChallenge,
} from "../session.server";
import type { User } from "../models/user.server";
import { loader } from "./passkey.reauth-options";

vi.mock("../db.server");

vi.mock("@simplewebauthn/server", async () => ({
  ...(await vi.importActual("@simplewebauthn/server")),
  generateAuthenticationOptions:
    vi.fn<() => Promise<PublicKeyCredentialRequestOptionsJSON>>(),
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  requireUser: vi.fn<() => Promise<User>>(),
  sessionStorage: {
    commitSession: vi.fn<() => Promise<string>>(),
  },
  setPasskeyReauthChallenge: vi.fn<() => Promise<unknown>>(),
}));

describe("Passkey Reauth Options Route", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    plexToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest = new Request(
    "http://localhost:3000/passkey/reauth-options"
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue(mockUser);
    process.env.RP_ID = "localhost";
  });

  it("should require authentication", async () => {
    vi.mocked(requireUser).mockRejectedValue(new Error("Not authenticated"));

    await expect(() =>
      loader({ request: mockRequest } as LoaderFunctionArgs)
    ).rejects.toThrow("Not authenticated");
  });

  it("should return authentication options and set reauth challenge in session", async () => {
    const mockOptions = {
      challenge: "reauth-challenge-123",
      rpId: "localhost",
      allowCredentials: [],
    };
    const mockSession = { id: "session-123" };

    vi.mocked(generateAuthenticationOptions).mockResolvedValue(
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      mockOptions as any
    );
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(setPasskeyReauthChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

    const response = await loader({
      request: mockRequest,
    } as LoaderFunctionArgs);

    expect(requireUser).toHaveBeenCalledWith(mockRequest);
    expect(generateAuthenticationOptions).toHaveBeenCalledWith({
      rpID: "localhost",
      allowCredentials: [],
      userVerification: "preferred",
    });
    expect(setPasskeyReauthChallenge).toHaveBeenCalledWith(
      mockRequest,
      "reauth-challenge-123"
    );
    expect(response.data).toEqual(mockOptions);
  });

  it("should use RP_ID environment variable", async () => {
    process.env.RP_ID = "example.com";

    const mockOptions = { challenge: "challenge-xyz" };
    const mockSession = { id: "session-123" };

    vi.mocked(generateAuthenticationOptions).mockResolvedValue(
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      mockOptions as any
    );
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(setPasskeyReauthChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

    await loader({ request: mockRequest } as LoaderFunctionArgs);

    expect(generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({ rpID: "example.com" })
    );
  });

  it("should commit session with reauth challenge cookie", async () => {
    const mockOptions = { challenge: "challenge-abc" };
    const mockSession = { id: "session-123" };

    vi.mocked(generateAuthenticationOptions).mockResolvedValue(
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      mockOptions as any
    );
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(setPasskeyReauthChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(sessionStorage.commitSession).mockResolvedValue(
      "reauth-session-cookie"
    );

    await loader({ request: mockRequest } as LoaderFunctionArgs);

    expect(sessionStorage.commitSession).toHaveBeenCalledWith(mockSession);
  });
});
