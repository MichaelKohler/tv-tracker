import * as React from "react";
import { useNavigation } from "react-router";

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import ShowTile, { type Props } from "./show-tile";
import { testShow } from "~/test-utils";

const show: Props["show"] = {
  ...testShow,
  archived: false,
  unwatchedEpisodesCount: 1,
};

beforeEach(() => {
  vi.mock("react-router", async () => {
    return {
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

  expect(screen.getByText("1")).toBeInTheDocument();
  expect(screen.getByText(show.name)).toBeInTheDocument();
});

test("does not render navigation spinner on different tile", async () => {
  vi.mocked(useNavigation).mockReturnValue({
    state: "loading",
    // @ts-expect-error (we don't need to specify all properties)
    location: { pathname: `/tv/not-this-show` },
  });

  render(<ShowTile show={show} />);

  expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
});
