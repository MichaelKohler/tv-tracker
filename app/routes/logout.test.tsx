import { redirect } from "@remix-run/node";

import { logout } from "../session.server";
import { action, loader } from "./logout";

beforeEach(() => {
  vi.mock("../session.server", async () => {
    return {
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
