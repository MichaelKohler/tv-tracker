import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import StatCard from "./stat-card";

test("renders stat card with title and value", () => {
  render(<StatCard title="Test Title" value="42" />);

  expect(screen.getByText("Test Title")).toBeInTheDocument();
  expect(screen.getByText("42")).toBeInTheDocument();
});

test("renders stat card with description", () => {
  render(
    <StatCard
      title="Test Title"
      value="42"
      description="This is a test description"
    />
  );

  expect(screen.getByText("Test Title")).toBeInTheDocument();
  expect(screen.getByText("42")).toBeInTheDocument();
  expect(screen.getByText("This is a test description")).toBeInTheDocument();
});

test("renders stat card without description", () => {
  render(<StatCard title="Test Title" value="42" />);

  expect(screen.getByText("Test Title")).toBeInTheDocument();
  expect(screen.getByText("42")).toBeInTheDocument();
  expect(screen.queryByText("This is a test description")).not.toBeInTheDocument();
});

test("applies custom className", () => {
  const { container } = render(
    <StatCard title="Test Title" value="42" className="custom-class" />
  );

  const statCard = container.firstChild as HTMLElement;
  expect(statCard).toHaveClass("custom-class");
});

test("renders numeric values", () => {
  render(<StatCard title="Count" value={123} />);

  expect(screen.getByText("Count")).toBeInTheDocument();
  expect(screen.getByText("123")).toBeInTheDocument();
});
