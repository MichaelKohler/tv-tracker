import { redirect } from "react-router";

import { logout } from "../session.server";
import { action, loader } from "./logout";

beforeEach(() => {
  vi.mock("../session.server", async () => {
    const actual = await vi.importActual("../session.server");

    return {
      ...actual,
      logout: vi.fn(),
    };
  });
});

test("loader returns redirect", async () => {
  const response = await loader();

  expect(response).toStrictEqual(redirect("/"));
});

test("action should logout user", async () => {
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
