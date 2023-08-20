import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import Footer from "./footer";

test("renders footer", async () => {
  render(<Footer />);

  expect(screen.getByText("Open Source")).toBeInTheDocument();
  expect(screen.getByText(/Michael Kohler/)).toBeInTheDocument();
});
