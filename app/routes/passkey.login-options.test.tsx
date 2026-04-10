import type { LoaderFunctionArgs } from "react-router";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/types";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

import type { RateLimitResult } from "../rate-limiter.server";
import { checkRateLimit, getClientIp } from "../rate-limiter.server";
import { sessionStorage, setPasskeyChallenge } from "../session.server";
import { loader } from "./passkey.login-options";

vi.mock("../db.server");

vi.mock("../rate-limiter.server", () => ({
  checkRateLimit: vi
    .fn<() => RateLimitResult>()
    .mockReturnValue({ limited: false, retryAfterSeconds: 0 }),
  getClientIp: vi.fn<() => string>().mockReturnValue("127.0.0.1"),
}));

vi.mock("@simplewebauthn/server", async () => ({
  ...(await vi.importActual("@simplewebauthn/server")),
  generateAuthenticationOptions:
    vi.fn<() => Promise<PublicKeyCredentialRequestOptionsJSON>>(),
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  sessionStorage: {
    commitSession: vi.fn<() => Promise<string>>(),
  },
  setPasskeyChallenge: vi.fn<() => Promise<unknown>>(),
}));

describe("Passkey Login Options Route", () => {
  const mockRequest = new Request(
    "http://localhost:3000/passkey/login-options"
  );

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RP_ID = "localhost";
  });

  it("should return authentication options", async () => {
    const mockSession = { id: "session-123" };
    const mockOptions = {
      challenge: "test-challenge-123",
      rpId: "localhost",
      allowCredentials: [],
      userVerification: "preferred" as const,
    };

    vi.mocked(generateAuthenticationOptions).mockResolvedValue(
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      mockOptions as any
    );
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(setPasskeyChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

    const response = await loader({
      request: mockRequest,
    } as LoaderFunctionArgs);

    const responseData = response.data;

    expect(generateAuthenticationOptions).toHaveBeenCalledWith({
      rpID: "localhost",
      allowCredentials: [],
      userVerification: "preferred",
    });
    expect(setPasskeyChallenge).toHaveBeenCalledWith(
      mockRequest,
      "test-challenge-123"
    );
    expect(responseData).toEqual(mockOptions);
  });

  it("should use environment variable for RP ID", async () => {
    process.env.RP_ID = "example.com";

    const mockSession = { id: "session-123" };
    const mockOptions = {
      challenge: "test-challenge",
      rpId: "example.com",
    };

    vi.mocked(generateAuthenticationOptions).mockResolvedValue(
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      mockOptions as any
    );
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(setPasskeyChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

    await loader({ request: mockRequest } as LoaderFunctionArgs);

    expect(generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        rpID: "example.com",
      })
    );
  });

  it("should use default RP ID when environment variable is not set", async () => {
    delete process.env.RP_ID;

    const mockSession = { id: "session-123" };
    const mockOptions = { challenge: "test-challenge" };

    vi.mocked(generateAuthenticationOptions).mockResolvedValue(
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      mockOptions as any
    );
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(setPasskeyChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

    await loader({ request: mockRequest } as LoaderFunctionArgs);

    expect(generateAuthenticationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        rpID: "localhost",
      })
    );
  });

  it("should store challenge in session", async () => {
    const mockSession = { id: "session-123" };
    const mockOptions = { challenge: "stored-challenge-789" };

    vi.mocked(generateAuthenticationOptions).mockResolvedValue(
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      mockOptions as any
    );
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(setPasskeyChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

    await loader({ request: mockRequest } as LoaderFunctionArgs);

    expect(setPasskeyChallenge).toHaveBeenCalledWith(
      mockRequest,
      "stored-challenge-789"
    );
    expect(sessionStorage.commitSession).toHaveBeenCalledWith(mockSession);
  });

  it("should return 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({
      limited: true,
      retryAfterSeconds: 900,
    });

    const response = await loader({
      request: mockRequest,
    } as LoaderFunctionArgs);

    // @ts-expect-error : we do not actually have a real response here..
    expect(response.init?.status).toBe(429);
    // @ts-expect-error : we do not actually have a real response here..
    expect(response.data.error).toBe(
      "Too many requests. Please try again later."
    );
    expect(generateAuthenticationOptions).not.toHaveBeenCalled();
  });

  it("should use IP-based key for rate limiting", async () => {
    vi.mocked(getClientIp).mockReturnValue("10.0.0.3");

    const mockSession = { id: "session-123" };
    vi.mocked(generateAuthenticationOptions).mockResolvedValue(
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      { challenge: "test" } as any
    );
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(setPasskeyChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(sessionStorage.commitSession).mockResolvedValue("session-cookie");

    await loader({ request: mockRequest } as LoaderFunctionArgs);

    expect(checkRateLimit).toHaveBeenCalledWith(
      "passkey-login:10.0.0.3",
      10,
      900_000
    );
  });

  it("should return response with session cookie header", async () => {
    const mockSession = { id: "session-123" };
    const mockOptions = { challenge: "test-challenge" };

    vi.mocked(generateAuthenticationOptions).mockResolvedValue(
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any
      mockOptions as any
    );
    // oxlint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(setPasskeyChallenge).mockResolvedValue(mockSession as any);
    vi.mocked(sessionStorage.commitSession).mockResolvedValue(
      "session-cookie-value"
    );

    const response = await loader({
      request: mockRequest,
    } as LoaderFunctionArgs);

    expect(response.init?.headers).toEqual({
      "Set-Cookie": "session-cookie-value",
    });
  });
});
