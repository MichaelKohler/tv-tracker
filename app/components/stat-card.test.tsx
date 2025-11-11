import { expect, test } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import StatCard from "./stat-card";

test("renders stat card with title and value", () => {
  render(<StatCard title="Test Title" value="42" />);

  expect(page.getByText("Test Title")).toBeInTheDocument();
  expect(page.getByText("42")).toBeInTheDocument();
});

test("renders stat card with description", () => {
  render(
    <StatCard
      title="Test Title"
      value="42"
      description="This is a test description"
    />
  );

  expect(page.getByText("Test Title")).toBeInTheDocument();
  expect(page.getByText("42")).toBeInTheDocument();
  expect(page.getByText("This is a test description")).toBeInTheDocument();
});

test("renders stat card without description", () => {
  render(<StatCard title="Test Title" value="42" />);

  expect(page.getByText("Test Title")).toBeInTheDocument();
  expect(page.getByText("42")).toBeInTheDocument();
  expect(page.getByText("This is a test description")).not.toBeInTheDocument();
});

test("renders numeric values", () => {
  render(<StatCard title="Count" value={123} />);

  expect(page.getByText("Count")).toBeInTheDocument();
  expect(page.getByText("123")).toBeInTheDocument();
});
