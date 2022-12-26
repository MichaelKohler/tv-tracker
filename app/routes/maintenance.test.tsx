import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import Maintenance from "./maintenance";

test("renders maintenance", () => {
  render(<Maintenance />);

  expect(screen.getByText("Maintenance mode")).toBeDefined();
});
