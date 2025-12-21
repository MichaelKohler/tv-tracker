import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getUserId } from "../session.server";
import Join, { loader } from "./join";

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn().mockReturnValue({}),
  useActionData: vi.fn(),
  useSearchParams: vi.fn().mockReturnValue([
    {
      get: () => "dummySearchParamValue..",
    },
  ]),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
  Link: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("../session.server", async () => ({
  ...(await vi.importActual("../session.server")),
  getUserId: vi.fn(),
}));

describe("Join Route", () => {
  it("renders join form", () => {
    render(<Join />);

    expect(screen.getByText("Email address")).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
    expect(screen.getByText("Create Account")).toBeInTheDocument();
  });

  it("loader redirects if there is a user", async () => {
    vi.mocked(getUserId).mockResolvedValue("123");

    const response = await loader({
      request: new Request("http://localhost:8080/join"),
      context: {},
      params: {},
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/");
  });

  it("loader returns nothing if there is no user", async () => {
    vi.mocked(getUserId).mockResolvedValue(undefined);

    const result = await loader({
      request: new Request("http://localhost:8080/join"),
      context: {},
      params: {},
    });

    expect(result).toStrictEqual({});
  });
});
