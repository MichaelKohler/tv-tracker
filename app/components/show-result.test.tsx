import * as React from "react";
import type { Show } from "@prisma/client";
import { useNavigation } from "@remix-run/react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import ShowResult from "./show-result";

const show: Show = {
  createdAt: new Date(),
  updatedAt: new Date(),
  id: "1",
  imageUrl: "https://example.com/image.png",
  mazeId: "1",
  name: "Test Show 1",
  summary: "Test Summary",
  premiered: new Date(),
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

  expect(screen.getByText(show.name)).toBeDefined();
  expect(screen.getByText(show.summary)).toBeDefined();
  expect(
    screen.getByText(new Date(show.premiered).toLocaleDateString())
  ).toBeDefined();
  expect(screen.getByText("5")).toBeDefined();
  expect(screen.getByText("Add Show")).toBeDefined();
});

test("renders spinner on adding show", async () => {
  vi.mocked(useNavigation).mockReturnValue({
    // @ts-ignore-next-line (we don't need to specify all methods of FormData)
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

  expect(screen.queryByTestId("spinner")).toBeDefined();
  expect(screen.queryByText(/Add Show/)).toBeNull();
});

test("does not render spinner or button on adding another show", async () => {
  vi.mocked(useNavigation).mockReturnValue({
    // @ts-ignore-next-line (we don't need to specify all methods of FormData)
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

  expect(screen.queryByTestId("spinner")).toBeNull();
  expect(screen.queryByText(/Add Show/)).toBeNull();
});

test("does not render spinner on other action", async () => {
  vi.mocked(useNavigation).mockReturnValue({
    // @ts-ignore-next-line (we don't need to specify all methods of FormData)
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

  expect(screen.queryByTestId("spinner")).toBeNull();
  expect(screen.getByText(/Add Show/)).toBeDefined();
});
