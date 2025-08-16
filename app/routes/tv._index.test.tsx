import { act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Form, MemoryRouter, useLoaderData, useNavigation } from "react-router";

import { evaluate } from "../flags.server";
import { getSortedShowsByUserId } from "../models/show.server";
import { requireUserId } from "../session.server";

import TVIndex, { loader } from "./tv._index";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: vi.fn(),
    useNavigation: vi.fn(),
    Form: vi.fn().mockReturnValue(<form data-testid="search-form"></form>),
  };
});
vi.mock("../flags.server", () => ({
  evaluate: vi.fn(),
}));
vi.mock("../models/show.server");
vi.mock("../session.server");

const shows = [
  {
    id: "1",
    name: "Show 1",
    unwatchedEpisodesCount: 1,
  },
  {
    id: "2",
    name: "Show 2",
    unwatchedEpisodesCount: 2,
  },
];

const renderComponent = () =>
  render(
    <MemoryRouter>
      <TVIndex />
    </MemoryRouter>
  );

test("renders the page with search enabled", async () => {
  vi.mocked(useLoaderData).mockReturnValue({
    shows: Promise.resolve(shows),
    features: { search: true },
  });
  vi.mocked(useNavigation).mockReturnValue({
    formData: undefined,
  });
  await act(async () => {
    renderComponent();
  });
  await screen.findByText(
    "You are currently tracking 2 shows with 3 unwatched episodes."
  );
  expect(screen.getByTestId("search-form")).toBeInTheDocument();
});

test("renders the page with search disabled", async () => {
  vi.mocked(useLoaderData).mockReturnValue({
    shows: Promise.resolve(shows),
    features: { search: false },
  });
  vi.mocked(useNavigation).mockReturnValue({
    formData: undefined,
  });
  await act(async () => {
    renderComponent();
  });
  await screen.findByText(
    "You are currently tracking 2 shows with 3 unwatched episodes."
  );
  expect(screen.queryByTestId("search-form")).not.toBeInTheDocument();
});

test("loader returns shows and feature flag", async () => {
  vi.mocked(requireUserId).mockResolvedValue("123");
  vi.mocked(getSortedShowsByUserId).mockResolvedValue([]);
  vi.mocked(evaluate).mockResolvedValue(true);
  const request = new Request("http://localhost", {
    headers: { "x-user-email": "test@example.com" },
  });
  const response = await loader({ request, context: {}, params: {} });
  expect(response.features.search).toBe(true);
});
