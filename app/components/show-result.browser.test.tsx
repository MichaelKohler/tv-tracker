import * as React from "react";
import { useNavigation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { testShow } from "../test-utils";
import ShowResult from "./show-result";

const show = testShow;

vi.mock("react-router", async () => ({
  ...(await vi.importActual("react-router")),
  useNavigation: vi.fn(),
  Form: ({ children }: { children: React.ReactNode }) => (
    <form>{children}</form>
  ),
}));

describe("ShowResult", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // @ts-expect-error .. we don't need to specify all of it
    vi.mocked(useNavigation).mockReturnValue({
      formData: new FormData(),
    });
  });

  it("renders show result", async () => {
    render(<ShowResult show={show} features={{ addShow: true }} />);

    expect(page.getByText(show.name, { exact: true })).toBeInTheDocument();
    expect(page.getByText(show.summary)).toBeInTheDocument();
    expect(
      page.getByText(new Date(show.premiered).toLocaleDateString())
    ).toBeInTheDocument();
    expect(page.getByText("8.5")).toBeInTheDocument();
    expect(page.getByText("Add Show")).toBeInTheDocument();
  });

  it("does not render add show button with feature disabled", async () => {
    render(<ShowResult show={show} features={{ addShow: false }} />);

    expect(page.getByText(show.name, { exact: true })).toBeInTheDocument();
    expect(page.getByText("Add Show")).not.toBeInTheDocument();
  });

  it("renders spinner on adding show", async () => {
    vi.mocked(useNavigation).mockReturnValue({
      // @ts-expect-error (we don't need to specify all methods of FormData)
      formData: {
        get(key: string) {
          if (key === "intent") {
            return "add-show";
          }

          if (key === "showId") {
            return show.id.toString();
          }

          return "";
        },
      },
    });

    render(<ShowResult show={show} features={{ addShow: true }} />);

    expect(page.getByTestId("spinner")).toBeInTheDocument();
    expect(page.getByText(/Add Show/)).not.toBeInTheDocument();
  });

  it("does not render spinner or button on adding another show", async () => {
    vi.mocked(useNavigation).mockReturnValue({
      // @ts-expect-error (we don't need to specify all methods of FormData)
      formData: {
        get(key: string) {
          if (key === "intent") {
            return "add-show";
          }

          if (key === "showId") {
            return "not-this-show";
          }

          return "";
        },
      },
    });

    render(<ShowResult show={show} features={{ addShow: true }} />);

    expect(page.getByTestId("spinner")).not.toBeInTheDocument();
    expect(page.getByText(/Add Show/)).not.toBeInTheDocument();
  });

  it("does not render spinner on other action", async () => {
    vi.mocked(useNavigation).mockReturnValue({
      // @ts-expect-error (we don't need to specify all methods of FormData)
      formData: {
        get(key: string) {
          if (key === "intent") {
            return "some-other-intent";
          }

          if (key === "showId") {
            return show.id.toString();
          }

          return "";
        },
      },
    });

    render(<ShowResult show={show} features={{ addShow: true }} />);

    expect(page.getByTestId("spinner")).not.toBeInTheDocument();
    expect(page.getByText(/Add Show/)).toBeInTheDocument();
  });
});
