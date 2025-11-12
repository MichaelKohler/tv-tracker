import { describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";

import Footer from "./footer";

describe("Footer", () => {
  it("renders footer", async () => {
    render(<Footer />);

    expect(page.getByText("Open Source")).toBeInTheDocument();
    expect(page.getByText(/Michael Kohler/)).toBeInTheDocument();
  });
});
