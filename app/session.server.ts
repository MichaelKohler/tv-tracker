import {
  type Session,
  createCookieSessionStorage,
  redirect,
} from "react-router";
import invariant from "tiny-invariant";

import {
  type LoginCredential,
  createReplacementSession,
  createSession,
  deleteSession,
  deleteUserSessions,
  getActiveSessionUserId,
  prepareNewSession,
} from "./models/session.server";
import { memoizeSessionLookup, setUserId } from "./request-context.server";
import { PASSKEY_CHALLENGE_TTL_MS } from "./constants";
import type { User } from "./models/user.server";
import { getUserById } from "./models/user.server";
import { logError } from "./logger.server";

invariant(process.env.SESSION_SECRET, "SESSION_SECRET must be set");

const cookieSessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
  },
});

const ONE_DAY_IN_SECONDS = 60 * 60 * 24;
const SEVEN_DAYS_IN_SECONDS = ONE_DAY_IN_SECONDS * 7;

const SESSION_TOKEN_KEY = "sessionToken";
const SESSION_EXPIRES_AT_KEY = "sessionExpiresAt";
const PASSKEY_CHALLENGE_KEY = "passkeyChallenge";
const PASSKEY_REAUTH_CHALLENGE_KEY = "passkeyReauthChallenge";

const commitSessionUntilExpiry: typeof cookieSessionStorage.commitSession = (
  session,
  options
) => {
  const expiresAt = session.get(SESSION_EXPIRES_AT_KEY);
  if (typeof expiresAt !== "number") {
    return cookieSessionStorage.commitSession(session, options);
  }

  const remainingSeconds = Math.ceil((expiresAt - Date.now()) / 1000);
  return cookieSessionStorage.commitSession(session, {
    maxAge: Math.max(remainingSeconds, 0),
    ...options,
  });
};

export const sessionStorage = {
  ...cookieSessionStorage,
  commitSession: commitSessionUntilExpiry,
};

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function getUserId(
  request: Request
): Promise<User["id"] | undefined> {
  const session = await getSession(request);
  const token = session.get(SESSION_TOKEN_KEY);
  if (typeof token !== "string") return undefined;

  const userId = await memoizeSessionLookup(token, () =>
    getActiveSessionUserId(token)
  );

  if (userId) {
    setUserId(userId);
  }

  return userId;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (userId === undefined) return null;

  const user = await getUserById(userId);
  if (user) return user;

  logError("User not found despite valid session - forcing logout", {});

  throw await logout(request);
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const userId = await getUserId(request);
  if (!userId) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function requireUser(request: Request) {
  const userId = await requireUserId(request);

  const user = await getUserById(userId);
  if (user) return user;

  logError("User not found despite valid session - forcing logout", {});

  throw await logout(request);
}

export async function prepareUserSession({
  request,
  remember,
  redirectTo,
}: {
  request: Request;
  remember: boolean;
  redirectTo: string;
}) {
  const session = await getSession(request);
  const lifetimeInSeconds = remember
    ? SEVEN_DAYS_IN_SECONDS
    : ONE_DAY_IN_SECONDS;
  const expiresAt = Date.now() + lifetimeInSeconds * 1000;
  const previousToken = session.get(SESSION_TOKEN_KEY);
  const { token, newSession } = prepareNewSession(
    new Date(expiresAt),
    typeof previousToken === "string" ? previousToken : undefined
  );
  session.set(SESSION_TOKEN_KEY, token);
  session.set(SESSION_EXPIRES_AT_KEY, expiresAt);
  return {
    newSession,
    response: redirect(redirectTo, {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      },
    }),
  };
}

export async function createUserSession({
  request,
  userId,
  remember,
  redirectTo,
  credential,
}: {
  request: Request;
  userId: string;
  remember: boolean;
  redirectTo: string;
  credential: LoginCredential;
}) {
  const { newSession, response } = await prepareUserSession({
    request,
    remember,
    redirectTo,
  });
  await createSession(userId, newSession, credential);
  return response;
}

export async function prepareSessionRotation(request: Request) {
  const session = await getSession(request);
  const storedExpiresAt = session.get(SESSION_EXPIRES_AT_KEY);
  const expiresAt =
    typeof storedExpiresAt === "number"
      ? storedExpiresAt
      : Date.now() + ONE_DAY_IN_SECONDS * 1000;
  const currentToken = session.get(SESSION_TOKEN_KEY);
  const { token, replacementSession } = createReplacementSession(
    typeof currentToken === "string" ? currentToken : "",
    new Date(expiresAt)
  );
  session.set(SESSION_TOKEN_KEY, token);
  session.set(SESSION_EXPIRES_AT_KEY, expiresAt);
  session.unset(PASSKEY_CHALLENGE_KEY);
  return {
    replacementSession,
    headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
  };
}

async function redirectWithDestroyedCookie(session: Session) {
  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}

export async function logout(request: Request) {
  const session = await getSession(request);
  const token = session.get(SESSION_TOKEN_KEY);
  if (typeof token === "string") {
    try {
      await deleteSession(token);
    } catch (error) {
      logError("Failed to revoke session during logout", {}, error);
      throw error;
    }
  }
  return redirectWithDestroyedCookie(session);
}

export async function clearSessionCookie(request: Request) {
  return redirectWithDestroyedCookie(await getSession(request));
}

export async function logoutAllDevices(request: Request, userId: string) {
  const session = await getSession(request);
  await deleteUserSessions(userId);
  return redirectWithDestroyedCookie(session);
}

function readUnexpiredChallenge(stored: unknown) {
  if (typeof stored !== "object" || stored === null) return undefined;

  const { challenge, issuedAt } = stored as Record<string, unknown>;
  if (typeof challenge !== "string" || typeof issuedAt !== "number") {
    return undefined;
  }

  return Date.now() - issuedAt < PASSKEY_CHALLENGE_TTL_MS
    ? challenge
    : undefined;
}

export async function setPasskeyChallenge(request: Request, challenge: string) {
  const session = await getSession(request);
  session.set(PASSKEY_CHALLENGE_KEY, { challenge, issuedAt: Date.now() });
  return session;
}

export async function getPasskeyChallenge(
  request: Request
): Promise<string | undefined> {
  const session = await getSession(request);
  return readUnexpiredChallenge(session.get(PASSKEY_CHALLENGE_KEY));
}

export async function clearPasskeyChallenge(request: Request) {
  const session = await getSession(request);
  session.unset(PASSKEY_CHALLENGE_KEY);
  return session;
}

export async function setPasskeyReauthChallenge(
  request: Request,
  challenge: string
) {
  const session = await getSession(request);
  session.set(PASSKEY_REAUTH_CHALLENGE_KEY, {
    challenge,
    issuedAt: Date.now(),
  });
  return session;
}

export async function getPasskeyReauthChallenge(
  request: Request
): Promise<string | undefined> {
  const session = await getSession(request);
  return readUnexpiredChallenge(session.get(PASSKEY_REAUTH_CHALLENGE_KEY));
}

export async function clearPasskeyReauthChallenge(request: Request) {
  const session = await getSession(request);
  session.unset(PASSKEY_REAUTH_CHALLENGE_KEY);
  return session;
}

export async function clearPasskeyChallenges(request: Request) {
  const session = await getSession(request);
  session.unset(PASSKEY_CHALLENGE_KEY);
  session.unset(PASSKEY_REAUTH_CHALLENGE_KEY);
  return session;
}
