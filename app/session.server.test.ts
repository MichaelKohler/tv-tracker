import { createHash } from "crypto";
import { hash } from "bcrypt";

import {
  clearSessionCookie,
  createUserSession,
  getSession,
  getUserId,
  logout,
  logoutAllDevices,
  prepareSessionRotation,
  sessionStorage,
  setPasskeyChallenge,
} from "./session.server";
import { prisma } from "./__mocks__/db.server";
import { runWithRequestContext } from "./request-context.server";

vi.mock("./db.server");

beforeEach(() => {
  prisma.$transaction.mockImplementation(((
    callback: (transaction: typeof prisma) => unknown
  ) => callback(prisma)) as never);
  prisma.passkey.findUnique.mockResolvedValue({ id: "passkey-1" } as never);
});

const FAST_BCRYPT_ROUNDS = 4;
const SEVEN_DAYS_IN_SECONDS = 60 * 60 * 24 * 7;
const ONE_DAY_IN_SECONDS = 60 * 60 * 24;
const ONE_HOUR_IN_SECONDS = 60 * 60;

const requestWithCookie = (cookie?: string | null) =>
  new Request("http://localhost:3000/", {
    headers: cookie ? { Cookie: cookie.split(";")[0] } : {},
  });

const loginCookie = async (remember: boolean) => {
  const response = await createUserSession({
    request: requestWithCookie(),
    userId: "user-123",
    remember,
    redirectTo: "/tv",
    credential: { passkeyId: "passkey-1" },
  });
  return response.headers.get("Set-Cookie");
};

const readMaxAge = (setCookie: string | null) => {
  const match = setCookie?.match(/Max-Age=(\d+)/);
  return match ? Number(match[1]) : undefined;
};

describe("session lifetime", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets a seven day lifetime when the user asks to be remembered", async () => {
    expect(readMaxAge(await loginCookie(true))).toBe(SEVEN_DAYS_IN_SECONDS);
  });

  it("sets a one day lifetime when the user does not ask to be remembered", async () => {
    expect(readMaxAge(await loginCookie(false))).toBe(ONE_DAY_IN_SECONDS);
  });

  it.each([
    { remember: true, lifetime: SEVEN_DAYS_IN_SECONDS },
    { remember: false, lifetime: ONE_DAY_IN_SECONDS },
  ])(
    "keeps the login lifetime when the session is committed again (remember: $remember)",
    async ({ remember, lifetime }) => {
      const request = requestWithCookie(await loginCookie(remember));

      const session = await setPasskeyChallenge(request, "challenge");
      const setCookie = await sessionStorage.commitSession(session);

      expect(readMaxAge(setCookie)).toBe(lifetime);
    }
  );

  it("does not extend the lifetime when the session is committed later", async () => {
    const request = requestWithCookie(await loginCookie(true));

    vi.setSystemTime(new Date("2026-01-01T01:00:00.000Z"));
    const session = await getSession(request);
    const setCookie = await sessionStorage.commitSession(session);

    expect(readMaxAge(setCookie)).toBe(
      SEVEN_DAYS_IN_SECONDS - ONE_HOUR_IN_SECONDS
    );
  });

  it("keeps an anonymous session as a browser session cookie", async () => {
    const session = await setPasskeyChallenge(requestWithCookie(), "challenge");

    const setCookie = await sessionStorage.commitSession(session);

    expect(readMaxAge(setCookie)).toBeUndefined();
  });
});

describe("session revocation", () => {
  const hashToken = (token: string) =>
    createHash("sha256").update(token).digest("hex");

  const readToken = async (setCookie: string | null) =>
    (await sessionStorage.getSession(setCookie)).get("sessionToken") as string;

  const storedSession = (expiresAt: Date) =>
    ({ userId: "user-123", expiresAt }) as never;

  const inOneHour = () => new Date(Date.now() + ONE_HOUR_IN_SECONDS * 1000);

  it("stores only a hash of a random token and never the user id", async () => {
    const setCookie = await loginCookie(true);
    const token = await readToken(setCookie);

    expect(token).toMatch(/^[\w-]{43}$/);
    expect(prisma.session.create).toHaveBeenCalledWith({
      data: {
        userId: "user-123",
        expiresAt: expect.any(Date),
        tokenHash: hashToken(token),
      },
    });
    expect(
      (await sessionStorage.getSession(setCookie)).get("userId")
    ).toBeUndefined();
  });

  it("issues a new token for every login", async () => {
    const first = await readToken(await loginCookie(false));
    const second = await readToken(await loginCookie(false));

    expect(first).not.toBe(second);
  });

  it("replaces the previous session and cleans up expired ones on login", async () => {
    const setCookie = await loginCookie(false);
    const previousToken = await readToken(setCookie);
    prisma.session.deleteMany.mockClear();

    await createUserSession({
      request: requestWithCookie(setCookie),
      userId: "user-123",
      remember: false,
      redirectTo: "/tv",
      credential: { passkeyId: "passkey-1" },
    });

    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { userId: "user-123", expiresAt: { lte: expect.any(Date) } },
          { tokenHash: hashToken(previousToken) },
        ],
      },
    });
  });

  it("writes the cleanup and the new session in one transaction", async () => {
    prisma.$transaction.mockClear();

    await loginCookie(true);

    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("does not send a cookie when the session can not be created", async () => {
    prisma.session.create.mockRejectedValue(new Error("db down"));

    await expect(loginCookie(true)).rejects.toThrow("db down");
  });

  describe("when the login credential changes before the session is written", () => {
    const passwordLogin = () =>
      createUserSession({
        request: requestWithCookie(),
        userId: "user-123",
        remember: false,
        redirectTo: "/tv",
        credential: { password: "current-password" },
      });

    it("creates the session when the password is still current", async () => {
      prisma.password.findUnique.mockResolvedValue({
        hash: await hash("current-password", FAST_BCRYPT_ROUNDS),
      } as never);

      await expect(passwordLogin()).resolves.toBeInstanceOf(Response);

      expect(prisma.session.create).toHaveBeenCalledOnce();
    });

    it("rejects the login when the password was changed", async () => {
      prisma.password.findUnique.mockResolvedValue({
        hash: await hash("new-password", FAST_BCRYPT_ROUNDS),
      } as never);

      await expect(passwordLogin()).rejects.toThrow("CREDENTIAL_CHANGED");

      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it("rejects the login when the password was removed", async () => {
      prisma.password.findUnique.mockResolvedValue(null);

      await expect(passwordLogin()).rejects.toThrow("CREDENTIAL_CHANGED");

      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it("rejects the login when the passkey was deleted", async () => {
      prisma.passkey.findUnique.mockResolvedValue(null);

      await expect(loginCookie(false)).rejects.toThrow("CREDENTIAL_CHANGED");

      expect(prisma.passkey.findUnique).toHaveBeenCalledWith({
        where: { id: "passkey-1", userId: "user-123" },
        select: { id: true },
      });
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it("locks the user before checking the credential", async () => {
      const steps: string[] = [];
      prisma.$queryRaw.mockImplementation((() => {
        steps.push("lock");
        return Promise.resolve([]);
      }) as never);
      prisma.passkey.findUnique.mockImplementation((() => {
        steps.push("check");
        return Promise.resolve({ id: "passkey-1" });
      }) as never);

      await loginCookie(false);

      expect(steps).toEqual(["lock", "check"]);
    });
  });

  it("returns the user of an active session", async () => {
    const request = requestWithCookie(await loginCookie(true));
    prisma.session.findUnique.mockResolvedValue(storedSession(inOneHour()));

    await expect(getUserId(request)).resolves.toBe("user-123");
  });

  it("rejects a cookie whose session was revoked", async () => {
    const request = requestWithCookie(await loginCookie(true));
    prisma.session.findUnique.mockResolvedValue(null);

    await expect(getUserId(request)).resolves.toBeUndefined();
  });

  it("rejects a cookie whose session has expired", async () => {
    const request = requestWithCookie(await loginCookie(true));
    prisma.session.findUnique.mockResolvedValue(
      storedSession(new Date(Date.now() - 1000))
    );

    await expect(getUserId(request)).resolves.toBeUndefined();
  });

  it("rejects a signed cookie that only holds a user id", async () => {
    const session = await sessionStorage.getSession();
    session.set("userId", "user-123");
    const setCookie = await sessionStorage.commitSession(session);

    await expect(
      getUserId(requestWithCookie(setCookie))
    ).resolves.toBeUndefined();
    expect(prisma.session.findUnique).not.toHaveBeenCalled();
  });

  it("looks up the session once per request context", async () => {
    const request = requestWithCookie(await loginCookie(true));
    prisma.session.findUnique.mockResolvedValue(storedSession(inOneHour()));

    await runWithRequestContext(request, async () => {
      await Promise.all([getUserId(request), getUserId(request)]);
      await getUserId(request);
    });

    expect(prisma.session.findUnique).toHaveBeenCalledTimes(1);
  });

  it("deletes only the current session on logout", async () => {
    const setCookie = await loginCookie(true);
    const token = await readToken(setCookie);

    const response = await logout(requestWithCookie(setCookie));

    expect(prisma.session.deleteMany).toHaveBeenLastCalledWith({
      where: { tokenHash: hashToken(token) },
    });
    expect(response.headers.get("Set-Cookie")).toContain(
      "Expires=Thu, 01 Jan 1970"
    );
  });

  it("fails the logout when revoking the session fails", async () => {
    const setCookie = await loginCookie(true);
    prisma.session.deleteMany.mockRejectedValue(new Error("db down"));

    await expect(logout(requestWithCookie(setCookie))).rejects.toThrow(
      "db down"
    );
  });

  it("clears the cookie without touching the database", async () => {
    const setCookie = await loginCookie(true);
    prisma.session.deleteMany.mockClear();

    const response = await clearSessionCookie(requestWithCookie(setCookie));

    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
    expect(response.headers.get("Location")).toBe("/");
    expect(response.headers.get("Set-Cookie")).toContain(
      "Expires=Thu, 01 Jan 1970"
    );
  });

  it("deletes every session of the user when logging out all devices", async () => {
    const setCookie = await loginCookie(true);

    const response = await logoutAllDevices(
      requestWithCookie(setCookie),
      "user-123"
    );

    expect(prisma.session.deleteMany).toHaveBeenLastCalledWith({
      where: { userId: "user-123" },
    });
    expect(response.headers.get("Location")).toBe("/");
    expect(response.headers.get("Set-Cookie")).toContain(
      "Expires=Thu, 01 Jan 1970"
    );
  });

  it("prepares a new token with the same expiry without writing it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const setCookie = await loginCookie(true);
    const previousToken = await readToken(setCookie);
    prisma.session.create.mockClear();

    vi.setSystemTime(new Date("2026-01-01T01:00:00.000Z"));
    const { headers, replacementSession } = await prepareSessionRotation(
      requestWithCookie(setCookie)
    );
    vi.useRealTimers();

    const rotatedToken = await readToken(headers["Set-Cookie"]);
    expect(rotatedToken).not.toBe(previousToken);
    expect(replacementSession).toEqual({
      currentToken: previousToken,
      tokenHash: hashToken(rotatedToken),
      expiresAt: new Date("2026-01-08T00:00:00.000Z"),
    });
    expect(prisma.session.create).not.toHaveBeenCalled();
    expect(readMaxAge(headers["Set-Cookie"])).toBe(
      SEVEN_DAYS_IN_SECONDS - ONE_HOUR_IN_SECONDS
    );
  });

  it("clears the pending passkey challenge when rotating", async () => {
    const session = await setPasskeyChallenge(requestWithCookie(), "challenge");
    const setCookie = await sessionStorage.commitSession(session);

    const { headers } = await prepareSessionRotation(
      requestWithCookie(setCookie)
    );

    const rotated = await sessionStorage.getSession(headers["Set-Cookie"]);
    expect(rotated.get("passkeyChallenge")).toBeUndefined();
  });
});
