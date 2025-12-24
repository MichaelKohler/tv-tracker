import { redirect } from "react-router";

import { logout } from "../session.server";
import { action, loader } from "./logout";

vi.mock("../db.server");

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  logout: vi.fn(),
}));

describe("Logout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns redirect from loader", async () => {
    const response = await loader();

    expect(response).toStrictEqual(redirect("/"));
  });

  it("should logout user", async () => {
    // @ts-expect-error .. ignore unstable_pattern for example
    await action({
      request: new Request("http://localhost:8080/logout", {
        method: "POST",
        body: null,
      }),
      context: {},
      params: {},
    });

    expect(logout).toBeCalled();
  });
});
