import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import MonthlyEpisodesChart from "./monthly-episodes-chart";

const mockData = [
  {
    month: "January 2025",
    episodes: 15,
    runtime: 750,
    showCount: 5,
  },
  {
    month: "December 2024",
    episodes: 8,
    runtime: 400,
    showCount: 3,
  },
  {
    month: "February 2025",
    episodes: 12,
    runtime: 600,
    showCount: 4,
  },
];

describe("MonthlyEpisodesChart", () => {
  it("renders chart title", () => {
    render(<MonthlyEpisodesChart data={mockData} />);
    expect(page.getByText("Episodes Watched Per Month")).toBeInTheDocument();
  });

  it("does not render when data is empty", () => {
    render(<MonthlyEpisodesChart data={[]} />);
    expect(
      page.getByText("Episodes Watched Per Month")
    ).not.toBeInTheDocument();
  });
});
