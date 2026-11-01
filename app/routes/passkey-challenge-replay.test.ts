import { RouterContextProvider } from "react-router";

import { PASSKEY_CHALLENGE_TTL_MS } from "../constants";

const usedChallenges = new Set<string>();

vi.unmock("../session.server");
vi.unmock("../models/passkey.server");

vi.mock("../db.server", () => ({
  prisma: {
    passkey: {
      create: vi.fn<() => Promise<unknown>>(),
      findUnique: vi.fn<() => Promise<unknown>>(),
      update: vi.fn<() => Promise<unknown>>(),
    },
    usedPasskeyChallenge: {
      createMany: vi.fn<() => Promise<{ count: number }>>(),
      deleteMany: vi.fn<() => Promise<{ count: number }>>(),
    },
  },
}));

vi.mock("@simplewebauthn/server", async () => ({
  ...(await vi.importActual("@simplewebauthn/server")),
  verifyAuthenticationResponse: vi.fn<() => Promise<unknown>>(),
  verifyRegistrationResponse: vi.fn<() => Promise<unknown>>(),
}));

vi.mock("../models/user.server", () => ({
  changePassword: vi.fn<() => Promise<void>>(),
  deleteUserByUserId: vi.fn<() => Promise<void>>(),
  getUserById: vi.fn<() => Promise<unknown>>(),
  removePassword: vi.fn<() => Promise<void>>(),
  userHasPassword: vi.fn<() => Promise<boolean>>(),
  verifyLogin: vi.fn<() => Promise<unknown>>(),
}));

vi.mock("../models/mail.server", () => ({
  sendPasskeyCreatedMail: vi.fn<() => Promise<void>>(),
}));

vi.mock("../rate-limiter.server", () => ({
  checkRateLimit: vi.fn<() => { limited: boolean }>(() => ({ limited: false })),
  getClientIp: vi.fn<() => string>(() => "10.0.0.1"),
}));

vi.resetModules();

const { verifyAuthenticationResponse, verifyRegistrationResponse } =
  await import("@simplewebauthn/server");
const { prisma } = await import("../db.server");
const { action: accountAction } = await import("./account");
const { action: deletionAction } = await import("./deletion");
const { action: loginVerifyAction } = await import("./passkey.login-verify");
const { action: registerVerifyAction } =
  await import("./passkey.register-verify");
const {
  changePassword,
  deleteUserByUserId,
  getUserById,
  removePassword,
  userHasPassword,
  verifyLogin,
} = await import("../models/user.server");
const { createUserSession, sessionStorage } = await import("../session.server");

const CHALLENGE = "login-or-registration-challenge";
const REAUTH_CHALLENGE = "reauth-challenge";

const createCookie = async ({
  issuedAt = Date.now(),
  userId = "user-123" as string | null,
} = {}) => {
  const session = await sessionStorage.getSession();
  if (userId) session.set("userId", userId);
  session.set("passkeyChallenge", { challenge: CHALLENGE, issuedAt });
  session.set("passkeyReauthChallenge", {
    challenge: REAUTH_CHALLENGE,
    issuedAt,
  });
  return (await sessionStorage.commitSession(session)).split(";")[0];
};

const readChallenges = async (setCookie: string | null) => {
  expect(setCookie).not.toBeNull();
  const session = await sessionStorage.getSession(setCookie);
  return {
    challenge: session.get("passkeyChallenge"),
    reauthChallenge: session.get("passkeyReauthChallenge"),
    userId: session.get("userId"),
  };
};

const routeArgs = (request: Request) => ({
  request,
  context: new RouterContextProvider(),
  url: new URL(request.url),
  pattern: "",
  params: {},
});

const formRequest = (
  path: string,
  cookie: string,
  fields: Record<string, string>
) => {
  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => body.append(key, value));
  return new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { Cookie: cookie },
    body,
  });
};

const jsonRequest = (path: string, cookie: string, body: unknown) =>
  new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });

const getSetCookie = (response: unknown) => {
  const { init } = response as { init: ResponseInit | null };
  return new Headers(init?.headers).get("Set-Cookie");
};

const getData = (response: unknown) => (response as { data: unknown }).data;

const getGenericError = (response: unknown) =>
  (getData(response) as { errors: { generic: string | null } }).errors.generic;

describe("passkey challenge consumption", () => {
  const passkeyCredential = JSON.stringify({ id: "credential-1" });
  const registration = {
    credential: { id: "new-credential" },
    name: "New Passkey",
    passkeyCredential: { id: "credential-1" },
  };

  const removeRequest = (cookie: string) =>
    formRequest("/account", cookie, {
      intent: "remove-password",
      passkeyCredential,
    });

  const setPasswordRequest = (cookie: string, newPassword = "newnewPassword") =>
    formRequest("/account", cookie, {
      newPassword,
      confirmPassword: newPassword,
      passkeyCredential,
    });

  afterAll(() => {
    vi.resetModules();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    usedChallenges.clear();

    vi.mocked(prisma.usedPasskeyChallenge.createMany).mockImplementation(
      ((args: { data: { challenge: string }[] }) => {
        const [{ challenge }] = args.data;
        const count = usedChallenges.has(challenge) ? 0 : 1;
        usedChallenges.add(challenge);
        return Promise.resolve({ count });
      }) as never
    );
    vi.mocked(prisma.usedPasskeyChallenge.deleteMany).mockResolvedValue({
      count: 0,
    } as never);
    vi.mocked(prisma.passkey.findUnique).mockResolvedValue({
      id: "passkey-1",
      userId: "user-123",
      credentialId: "credential-1",
      publicKey: Buffer.from([1, 2, 3]),
      counter: BigInt(0),
      transports: [],
    } as never);
    vi.mocked(prisma.passkey.create).mockResolvedValue({
      name: "New Passkey",
      createdAt: new Date(),
    } as never);
    vi.mocked(verifyAuthenticationResponse).mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 0 },
    } as never);
    vi.mocked(verifyRegistrationResponse).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "new-credential",
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
          transports: [],
        },
      },
    } as never);
    vi.mocked(getUserById).mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      plexToken: "plex-token",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(userHasPassword).mockResolvedValue(false);
    vi.mocked(verifyLogin).mockResolvedValue(null);
  });

  describe("replaying the original cookie and assertion", () => {
    it("removes the password only once", async () => {
      const cookie = await createCookie();

      await accountAction(routeArgs(removeRequest(cookie)));
      const replay = await accountAction(routeArgs(removeRequest(cookie)));

      expect(removePassword).toHaveBeenCalledOnce();
      expect(getGenericError(replay)).toBe("Challenge already used");
    });

    it("does not let a password removal assertion set a new password", async () => {
      const cookie = await createCookie();

      await accountAction(routeArgs(removeRequest(cookie)));
      const replay = await accountAction(
        routeArgs(setPasswordRequest(cookie, "attackerPassword"))
      );

      expect(changePassword).not.toHaveBeenCalled();
      expect(getGenericError(replay)).toBe("Challenge already used");
    });

    it("sets a password only once", async () => {
      const cookie = await createCookie();

      await accountAction(routeArgs(setPasswordRequest(cookie)));
      await accountAction(
        routeArgs(setPasswordRequest(cookie, "attackerPassword"))
      );

      expect(changePassword).toHaveBeenCalledOnce();
      expect(changePassword).toHaveBeenCalledWith(
        "test@example.com",
        "newnewPassword",
        ""
      );
    });

    it("does not let a failed deletion be retried with the same assertion", async () => {
      const cookie = await createCookie();
      const deletionRequest = () =>
        formRequest("/deletion", cookie, { passkeyCredential });
      vi.mocked(deleteUserByUserId).mockRejectedValueOnce(
        new Error("UNEXPECTED")
      );

      await deletionAction(routeArgs(deletionRequest()));
      const replay = await deletionAction(routeArgs(deletionRequest()));

      expect(deleteUserByUserId).toHaveBeenCalledOnce();
      expect(getData(replay)).toEqual({
        errors: { deletion: "Challenge already used", password: null },
      });
    });

    it("logs in only once", async () => {
      const cookie = await createCookie({ userId: null });
      const loginRequest = () =>
        jsonRequest("/passkey/login-verify", cookie, {
          credential: { id: "credential-1" },
        });

      const login = await loginVerifyAction(routeArgs(loginRequest()));
      const replay = await loginVerifyAction(routeArgs(loginRequest()));

      expect((login as Response).status).toBe(302);
      expect(getData(replay)).toEqual({ error: "Challenge already used" });
    });

    it("does not let a password removal assertion log in", async () => {
      const cookie = await createCookie();

      await accountAction(routeArgs(removeRequest(cookie)));
      const replay = await loginVerifyAction(
        routeArgs(
          jsonRequest("/passkey/login-verify", cookie, {
            credential: { id: "credential-1" },
          })
        )
      );

      expect(getData(replay)).toEqual({ error: "Challenge already used" });
    });

    it("registers only one passkey with a replayed reauth assertion", async () => {
      const cookie = await createCookie();
      const registerRequest = () =>
        jsonRequest("/passkey/register-verify", cookie, registration);

      await registerVerifyAction(routeArgs(registerRequest()));
      const replay = await registerVerifyAction(routeArgs(registerRequest()));

      expect(prisma.passkey.create).toHaveBeenCalledOnce();
      expect(getData(replay)).toEqual({ error: "Challenge already used" });
    });

    it("registers only one passkey with a replayed registration challenge", async () => {
      vi.mocked(userHasPassword).mockResolvedValue(true);
      vi.mocked(verifyLogin).mockResolvedValue({ id: "user-123" } as never);
      const cookie = await createCookie();
      const registerRequest = () =>
        jsonRequest("/passkey/register-verify", cookie, {
          ...registration,
          password: "correctPassword",
        });

      await registerVerifyAction(routeArgs(registerRequest()));
      const replay = await registerVerifyAction(routeArgs(registerRequest()));

      expect(prisma.passkey.create).toHaveBeenCalledOnce();
      expect(getData(replay)).toEqual({ error: "Challenge already used" });
    });

    it("lets only one concurrent request through", async () => {
      const cookie = await createCookie();

      await Promise.all([
        accountAction(routeArgs(removeRequest(cookie))),
        accountAction(routeArgs(removeRequest(cookie))),
      ]);

      expect(removePassword).toHaveBeenCalledOnce();
    });
  });

  describe("challenge lifetime", () => {
    it("accepts a challenge just inside its lifetime", async () => {
      const cookie = await createCookie({
        issuedAt: Date.now() - PASSKEY_CHALLENGE_TTL_MS + 60_000,
      });

      await accountAction(routeArgs(removeRequest(cookie)));

      expect(removePassword).toHaveBeenCalledOnce();
    });

    it("rejects an expired challenge", async () => {
      const cookie = await createCookie({
        issuedAt: Date.now() - PASSKEY_CHALLENGE_TTL_MS,
      });

      const response = await accountAction(routeArgs(removeRequest(cookie)));

      expect(removePassword).not.toHaveBeenCalled();
      expect(verifyAuthenticationResponse).not.toHaveBeenCalled();
      expect(getGenericError(response)).toBe("No challenge found");
    });

    it("rejects a challenge stored before lifetimes were added", async () => {
      const session = await sessionStorage.getSession();
      session.set("userId", "user-123");
      session.set("passkeyChallenge", CHALLENGE);
      const cookie = (await sessionStorage.commitSession(session)).split(
        ";"
      )[0];

      const response = await accountAction(routeArgs(removeRequest(cookie)));

      expect(removePassword).not.toHaveBeenCalled();
      expect(getGenericError(response)).toBe("No challenge found");
    });
  });

  describe("failure handling", () => {
    it("does not record a challenge when verification fails", async () => {
      vi.mocked(verifyAuthenticationResponse).mockResolvedValueOnce({
        verified: false,
      } as never);

      const response = await accountAction(
        routeArgs(removeRequest(await createCookie()))
      );

      expect(prisma.usedPasskeyChallenge.createMany).not.toHaveBeenCalled();
      expect(removePassword).not.toHaveBeenCalled();
      expect(getSetCookie(response)).toBeNull();
    });

    it("refuses the action when the challenge can not be recorded", async () => {
      vi.mocked(prisma.usedPasskeyChallenge.createMany).mockRejectedValueOnce(
        new Error("Table missing")
      );

      const response = await accountAction(
        routeArgs(removeRequest(await createCookie()))
      );

      expect(removePassword).not.toHaveBeenCalled();
      expect(getGenericError(response)).toBe("Failed to verify passkey");
    });

    it("refuses the login when the challenge can not be recorded", async () => {
      vi.mocked(prisma.usedPasskeyChallenge.createMany).mockRejectedValueOnce(
        new Error("Table missing")
      );

      const response = await loginVerifyAction(
        routeArgs(
          jsonRequest(
            "/passkey/login-verify",
            await createCookie({ userId: null }),
            { credential: { id: "credential-1" } }
          )
        )
      );

      expect(getData(response)).toEqual({
        error: "Failed to authenticate passkey",
      });
    });
  });

  describe("clearing the challenge from the cookie", () => {
    it("clears the challenge after removing the password", async () => {
      const response = await accountAction(
        routeArgs(removeRequest(await createCookie()))
      );

      const { challenge, reauthChallenge, userId } = await readChallenges(
        getSetCookie(response)
      );
      expect(challenge).toBeUndefined();
      expect(reauthChallenge).toMatchObject({ challenge: REAUTH_CHALLENGE });
      expect(userId).toBe("user-123");
    });

    it.each([
      ["NEED_PASSKEY_BEFORE_REMOVAL", 400],
      ["NO_PASSWORD_TO_REMOVE", 400],
      ["UNEXPECTED", 500],
    ])(
      "clears the challenge when password removal fails with %s",
      async (message, status) => {
        vi.mocked(removePassword).mockRejectedValueOnce(new Error(message));

        const response = await accountAction(
          routeArgs(removeRequest(await createCookie()))
        );
        const { init } = response as unknown as { init: ResponseInit };

        expect(init.status).toBe(status);
        expect(
          (await readChallenges(getSetCookie(response))).challenge
        ).toBeUndefined();
      }
    );

    it("clears the challenge after setting a password", async () => {
      const response = await accountAction(
        routeArgs(setPasswordRequest(await createCookie()))
      );

      expect(
        (await readChallenges(getSetCookie(response))).challenge
      ).toBeUndefined();
    });

    it("clears the challenge when setting a password fails", async () => {
      vi.mocked(changePassword).mockRejectedValueOnce(new Error("UNEXPECTED"));

      const response = await accountAction(
        routeArgs(setPasswordRequest(await createCookie()))
      );

      expect(
        (await readChallenges(getSetCookie(response))).challenge
      ).toBeUndefined();
    });

    it("does not touch the session when changing a password with the current password", async () => {
      vi.mocked(userHasPassword).mockResolvedValue(true);
      vi.mocked(verifyLogin).mockResolvedValue({ id: "user-123" } as never);

      const response = await accountAction(
        routeArgs(
          formRequest("/account", await createCookie(), {
            password: "currentPassword",
            newPassword: "newnewPassword",
            confirmPassword: "newnewPassword",
          })
        )
      );

      expect(getSetCookie(response)).toBeNull();
    });

    it("clears the reauth challenge when deleting the user fails", async () => {
      vi.mocked(deleteUserByUserId).mockRejectedValueOnce(
        new Error("UNEXPECTED")
      );

      const response = await deletionAction(
        routeArgs(
          formRequest("/deletion", await createCookie(), { passkeyCredential })
        )
      );

      const { challenge, reauthChallenge, userId } = await readChallenges(
        getSetCookie(response)
      );
      expect(challenge).toMatchObject({ challenge: CHALLENGE });
      expect(reauthChallenge).toBeUndefined();
      expect(userId).toBe("user-123");
    });

    it("destroys the session after deleting the user", async () => {
      const response = (await deletionAction(
        routeArgs(
          formRequest("/deletion", await createCookie(), { passkeyCredential })
        )
      )) as Response;

      expect(deleteUserByUserId).toHaveBeenCalledWith("user-123");
      expect(await readChallenges(response.headers.get("Set-Cookie"))).toEqual({
        challenge: undefined,
        reauthChallenge: undefined,
        userId: undefined,
      });
    });

    it("keeps the login lifetime when clearing challenges", async () => {
      const login = await createUserSession({
        request: new Request("http://localhost:3000/"),
        userId: "user-123",
        remember: true,
        redirectTo: "/tv",
      });
      const loginCookie = login.headers.get("Set-Cookie");
      const session = await sessionStorage.getSession(loginCookie);
      session.set("passkeyChallenge", {
        challenge: CHALLENGE,
        issuedAt: Date.now(),
      });
      session.set("passkeyReauthChallenge", {
        challenge: REAUTH_CHALLENGE,
        issuedAt: Date.now(),
      });
      const cookie = (await sessionStorage.commitSession(session)).split(
        ";"
      )[0];

      const response = await registerVerifyAction(
        routeArgs(jsonRequest("/passkey/register-verify", cookie, registration))
      );

      const maxAge = getSetCookie(response)?.match(/Max-Age=(\d+)/)?.[1];
      expect(Number(maxAge)).toBeGreaterThan(60 * 60 * 24 * 6);
    });

    it("clears both challenges after registering", async () => {
      const response = await registerVerifyAction(
        routeArgs(
          jsonRequest(
            "/passkey/register-verify",
            await createCookie(),
            registration
          )
        )
      );

      expect(await readChallenges(getSetCookie(response))).toEqual({
        challenge: undefined,
        reauthChallenge: undefined,
        userId: "user-123",
      });
    });

    it.each([
      [
        "is rejected",
        () =>
          vi
            .mocked(verifyRegistrationResponse)
            .mockResolvedValueOnce({ verified: false } as never),
      ],
      [
        "throws",
        () =>
          vi
            .mocked(verifyRegistrationResponse)
            .mockRejectedValueOnce(new Error("UNEXPECTED")),
      ],
    ])(
      "clears both challenges when the registration response %s",
      async (_outcome, arrange) => {
        arrange();

        const response = await registerVerifyAction(
          routeArgs(
            jsonRequest(
              "/passkey/register-verify",
              await createCookie(),
              registration
            )
          )
        );

        expect(await readChallenges(getSetCookie(response))).toEqual({
          challenge: undefined,
          reauthChallenge: undefined,
          userId: "user-123",
        });
      }
    );

    it("rejects a replayed assertion sent with the cookie it received", async () => {
      vi.mocked(verifyRegistrationResponse).mockRejectedValueOnce(
        new Error("UNEXPECTED")
      );

      const firstResponse = await registerVerifyAction(
        routeArgs(
          jsonRequest(
            "/passkey/register-verify",
            await createCookie(),
            registration
          )
        )
      );
      const cookie = getSetCookie(firstResponse)!.split(";")[0];

      const replay = await registerVerifyAction(
        routeArgs(jsonRequest("/passkey/register-verify", cookie, registration))
      );

      expect(getData(replay)).toEqual({ error: "No challenge found" });
    });
  });
});
