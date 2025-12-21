import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { requireUser } from "../session.server";
import Account, { loader } from "./account";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useLoaderData: vi.fn(),
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  requireUser: vi.fn(),
}));

describe("Account Route", () => {
  it("renders account page", () => {
    vi.mocked(requireUser).mockResolvedValue({
      email: "test@test.com",
      plexToken: "test",
    });

    render(<Account />);
  });

  it("loader returns user", async () => {
    vi.mocked(requireUser).mockResolvedValue({
      email: "test@test.com",
      plexToken: "test",
    });

    const response = await loader({
      request: new Request("http://localhost:8080/account"),
      context: {},
      params: {},
    });

    expect(response.user.email).toBe("test@test.com");
  });
});
