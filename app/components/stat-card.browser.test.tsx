import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import StatCard from "./stat-card";
import { VisualTestContainer } from "./visual-test-helper";

describe("StatCard", () => {
  it("renders stat card with title and value", async () => {
    render(
      <VisualTestContainer testid="stat-card">
        <StatCard title="Test Title" value="42" />
      </VisualTestContainer>
    );

    expect(page.getByText("Test Title")).toBeInTheDocument();
    expect(page.getByText("42")).toBeInTheDocument();

    await document.fonts.ready;

    const element = page.getByTestId("stat-card");
    expect(element).toBeInTheDocument();
    await expect(element).toMatchScreenshot("stat-card");
  });

  it("renders stat card with description", () => {
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

  it("renders stat card without description", () => {
    render(<StatCard title="Test Title" value="42" />);

    expect(page.getByText("Test Title")).toBeInTheDocument();
    expect(page.getByText("42")).toBeInTheDocument();
    expect(
      page.getByText("This is a test description")
    ).not.toBeInTheDocument();
  });

  it("renders numeric values", () => {
    render(<StatCard title="Count" value={123} />);

    expect(page.getByText("Count")).toBeInTheDocument();
    expect(page.getByText("123")).toBeInTheDocument();
  });
});
