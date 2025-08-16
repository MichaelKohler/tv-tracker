import { MemoryRouter, useLoaderData } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { ADD_SHOW, SEARCH } from "../constants";
import { evaluate } from "../flags.server";
import { searchShows } from "../models/show.server";
import { requireUserId } from "../session.server";

import TVSearch, { loader } from "./tv.search";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: vi.fn(),
    useActionData: vi.fn(),
    useSearchParams: vi.fn().mockReturnValue([new URLSearchParams()]),
    useNavigation: vi.fn().mockReturnValue({}),
    Form: vi.fn().mockReturnValue(<form data-testid="search-form"></form>),
  };
});
vi.mock("../flags.server", () => ({
  evaluate: vi.fn(),
}));
vi.mock("../models/show.server");
vi.mock("../session.server");
vi.mock("../components/show-results", () => ({
  __esModule: true,
  default: () => <div data-testid="show-results"></div>,
}));

const renderComponent = () =>
  render(
    <MemoryRouter>
      <TVSearch />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

test("renders the page with search enabled", () => {
  vi.mocked(useLoaderData).mockReturnValue({
    shows: [],
    features: { search: true, addShow: true },
  });
  renderComponent();
  expect(screen.getByTestId("search-form")).toBeInTheDocument();
  expect(screen.getByTestId("show-results")).toBeInTheDocument();
});

test("renders the page with search disabled", () => {
  vi.mocked(useLoaderData).mockReturnValue({
    shows: [],
    features: { search: false, addShow: false },
  });
  renderComponent();
  expect(
    screen.getByText(
      "This feature is currently not available. Please try again later."
    )
  ).toBeInTheDocument();
  expect(screen.queryByTestId("search-form")).not.toBeInTheDocument();
  expect(screen.queryByTestId("show-results")).not.toBeInTheDocument();
});

test("loader returns shows and feature flags when enabled", async () => {
  vi.mocked(requireUserId).mockResolvedValue("123");
  vi.mocked(searchShows).mockResolvedValue([]);
  vi.mocked(evaluate).mockResolvedValue(true);
  const request = new Request("http://localhost?query=test", {
    headers: { "x-user-email": "test@example.com" },
  });
  await loader({ request, context: {}, params: {} });
  expect(evaluate).toHaveBeenCalledWith(SEARCH, {
    email: "test@example.com",
  });
  expect(evaluate).toHaveBeenCalledWith(ADD_SHOW, {
    email: "test@example.com",
  });
  expect(searchShows).toHaveBeenCalledWith("test", "123");
});

test("loader returns no shows and feature flags when disabled", async () => {
  vi.mocked(requireUserId).mockResolvedValue("123");
  vi.mocked(searchShows).mockResolvedValue([]);
  vi.mocked(evaluate).mockResolvedValue(false);
  const request = new Request("http://localhost?query=test", {
    headers: { "x-user-email": "test@example.com" },
  });
  const response = await loader({ request, context: {}, params: {} });
  expect(response.features.search).toBe(false);
  expect(response.features.addShow).toBe(false);
  expect(searchShows).not.toHaveBeenCalled();
});
