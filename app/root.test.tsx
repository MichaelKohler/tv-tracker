import "@testing-library/jest-dom";
import { RouterContextProvider, createRoutesStub } from "react-router";
import { render, screen } from "@testing-library/react";

import { getUser } from "./session.server";
import { useIsLoggedIn } from "./utils";

import { loader } from "./root";

vi.mock("./db.server");
vi.mock("./flags.server");
vi.mock("./session.server", async () => ({
  ...(await vi.importActual("./session.server")),
  getUser: vi.fn<typeof getUser>(),
}));

const PLEX_TOKEN = "e4fe1d61-ab49-4e08-ace4-bc070821e9b1";

const user = {
  id: "user-1",
  email: "foo@example.com",
  plexToken: PLEX_TOKEN,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const request = new Request("http://localhost/");

const callLoader = () =>
  loader({
    request,
    context: new RouterContextProvider(),
    url: new URL(request.url),
    pattern: "",
    params: {},
  });

const LoginState = () => <p>{useIsLoggedIn() ? "logged in" : "logged out"}</p>;

const renderLoginState = () => {
  const Stub = createRoutesStub([
    {
      id: "root",
      path: "/",
      loader: callLoader,
      Component: LoginState,
    },
  ]);

  render(<Stub />);
};

describe("root loader", () => {
  it("reports a logged out visitor", async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    const data = await callLoader();

    expect(data.isLoggedIn).toBe(false);
  });

  it("reports a logged in user without exposing the user record", async () => {
    vi.mocked(getUser).mockResolvedValue(user);

    const data = await callLoader();

    expect(data.isLoggedIn).toBe(true);
    expect(data).not.toHaveProperty("user");
    expect(JSON.stringify(data)).not.toContain(PLEX_TOKEN);
    expect(JSON.stringify(data)).not.toContain(user.email);
  });

  it("propagates the forced logout for a session without a user", async () => {
    const forcedLogout = new Response(null, { status: 302 });
    vi.mocked(getUser).mockRejectedValue(forcedLogout);

    await expect(callLoader()).rejects.toBe(forcedLogout);
  });
});

describe("useIsLoggedIn", () => {
  it("is true for a logged in user", async () => {
    vi.mocked(getUser).mockResolvedValue(user);

    renderLoginState();

    expect(await screen.findByText("logged in")).toBeInTheDocument();
  });

  it("is false for a logged out visitor", async () => {
    vi.mocked(getUser).mockResolvedValue(null);

    renderLoginState();

    expect(await screen.findByText("logged out")).toBeInTheDocument();
  });
});
