import * as React from "react";
import { useNavigation } from "@remix-run/react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import type { FrontendShow } from "../utils";
import ShowResult from "./show-result";

const show: FrontendShow = {
  createdAt: "2022-01-01T00:00:00Z",
  updatedAt: "2022-01-01T00:00:00Z",
  id: "1",
  imageUrl: "https://example.com/image.png",
  mazeId: "1",
  name: "Test Show 1",
  summary: "Test Summary",
  premiered: "2022-01-01T00:00:00Z",
  ended: null,
  rating: 5,
};

beforeEach(() => {
  vi.mock("@remix-run/react", async () => {
    return {
      useNavigation: vi.fn().mockReturnValue({}),
      Form: ({ children }: { children: React.ReactNode }) => (
        <form>{children}</form>
      ),
    };
  });
});

test("renders show result", async () => {
  render(<ShowResult show={show} />);

  expect(screen.getByText(show.name)).toBeInTheDocument();
  expect(screen.getByText(show.summary)).toBeInTheDocument();
  expect(
    screen.getByText(new Date(show.premiered).toLocaleDateString())
  ).toBeInTheDocument();
  expect(screen.getByText("5")).toBeInTheDocument();
  expect(screen.getByText("Add Show")).toBeInTheDocument();
});

test("renders spinner on adding show", async () => {
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

  render(<ShowResult show={show} />);

  expect(screen.getByTestId("spinner")).toBeInTheDocument();
  expect(screen.queryByText(/Add Show/)).not.toBeInTheDocument();
});

test("does not render spinner or button on adding another show", async () => {
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

  render(<ShowResult show={show} />);

  expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  expect(screen.queryByText(/Add Show/)).not.toBeInTheDocument();
});

test("does not render spinner on other action", async () => {
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

  render(<ShowResult show={show} />);

  expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  expect(screen.getByText(/Add Show/)).toBeInTheDocument();
});
