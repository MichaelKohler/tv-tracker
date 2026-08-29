import { RouterContextProvider, redirect } from "react-router";

import { action, loader } from "./logout";
import { logout } from "../session.server";

vi.mock("../db.server");

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  logout: vi.fn<() => Promise<Response>>(),
}));

describe("Logout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns redirect from loader", async () => {
    const response = loader();

    expect(response).toStrictEqual(redirect("/"));
  });

  it("should logout user", async () => {
    await action({
      request: new Request("http://localhost:8080/logout", {
        method: "POST",
        body: null,
      }),
      context: new RouterContextProvider(),
      url: new URL("http://localhost"),
      pattern: "",
      params: {},
    });

    expect(logout).toBeCalled();
  });
});
