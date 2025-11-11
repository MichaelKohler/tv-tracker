import * as React from "react";
import { useNavigation } from "react-router";

import { beforeEach, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import { testShow } from "../test-utils";
import ShowTile, { type Props } from "./show-tile";

const show: Props["show"] = {
  ...testShow,
  archived: false,
  unwatchedEpisodesCount: 1,
};

beforeEach(() => {
  vi.mock("react-router", async () => {
    const actual = await vi.importActual("react-router");

    return {
      ...actual,
      useNavigation: vi.fn().mockReturnValue({}),
      Form: ({ children }: { children: React.ReactNode }) => (
        <form>{children}</form>
      ),
      Link: ({ children }: { children: React.ReactNode }) => (
        <span>{children}</span>
      ),
    };
  });
});

test("renders show tile", async () => {
  render(<ShowTile show={show} />);

  expect(page.getByText("1")).toBeInTheDocument();
  expect(page.getByText(show.name)).toBeInTheDocument();
});

test("does not render navigation spinner on different tile", async () => {
  vi.mocked(useNavigation).mockReturnValue({
    state: "loading",
    // @ts-expect-error (we don't need to specify all properties)
    location: { pathname: `/tv/not-this-show` },
  });

  render(<ShowTile show={show} />);

  expect(page.getByTestId("spinner")).not.toBeInTheDocument();
});
