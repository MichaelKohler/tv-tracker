import { Form } from "react-router";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import ShowResult from "./show-result";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigation: vi.fn().mockReturnValue({}),
    Form: vi.fn().mockImplementation(({ children }) => <form>{children}</form>),
  };
});

const show = {
  id: "1",
  name: "Show 1",
  mazeId: 1,
  premiered: new Date(),
};

test("renders the component with add show enabled", () => {
  render(<ShowResult show={show} features={{ addShow: true }} />);
  expect(screen.getByText("Add Show")).toBeInTheDocument();
});

test("renders the component with add show disabled", () => {
  render(<ShowResult show={show} features={{ addShow: false }} />);
  expect(screen.queryByText("Add Show")).not.toBeInTheDocument();
});