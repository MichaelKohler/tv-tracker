import {
  createUserSession,
  getSession,
  sessionStorage,
  setPasskeyChallenge,
} from "./session.server";

vi.mock("./db.server");

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
