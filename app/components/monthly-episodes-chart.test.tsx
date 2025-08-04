import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";

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
    expect(screen.getByText("Episodes Watched Per Month")).toBeInTheDocument();
  });

  it("renders chart with data", () => {
    render(<MonthlyEpisodesChart data={mockData} />);
    // ResponsiveContainer and LineChart should be in the DOM
    const container = screen
      .getByText("Episodes Watched Per Month")
      .closest("div");
    expect(container).toBeInTheDocument();
  });

  it("does not render when data is empty", () => {
    render(<MonthlyEpisodesChart data={[]} />);
    expect(
      screen.queryByText("Episodes Watched Per Month")
    ).not.toBeInTheDocument();
  });
});
