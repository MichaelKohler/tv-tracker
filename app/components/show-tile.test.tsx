import * as React from "react";
import { useNavigation } from "react-router";

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import ShowTile, { type Props } from "./show-tile";

const show: Props["show"] = {
  archived: false,
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

test("renders navigation spinner on tile", async () => {
  vi.mocked(useNavigation).mockReturnValue({
    state: "loading",
    // @ts-expect-error (we don't need to specify all properties)
    location: { pathname: `/tv/${show.id}` },
  });

  render(<ShowTile show={show} />);

  expect(screen.getByTestId("spinner")).toBeInTheDocument();
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
