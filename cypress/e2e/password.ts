import { faker } from "@faker-js/faker";

describe("password tests", () => {
  const email = "foo@example.com";
  const newPassword = faker.internet.password();

  afterEach(() => {
    cy.cleanupUser();
  });

  it("should allow to change password", () => {
    cy.login({ email });
    cy.visitAndCheck("/");

    cy.findByRole("link", { name: /account/i }).click();
    cy.findByRole("link", { name: /change password/i }).click();

    cy.findByLabelText(/current password/i).type("myreallystrongpassword");
    cy.findByLabelText(/new password/i).type(newPassword);
    cy.findByLabelText(/confirm password/i).type(newPassword);
    cy.findByRole("button", { name: /change password/i }).click();

    cy.findByRole("button", { name: /logout/i }).click();

    cy.findByRole("link", { name: /log in/i }).click();
    cy.findByRole("textbox", { name: /email/i }).type(email);
    cy.findByLabelText(/password/i).type(newPassword);
    cy.findByRole("button", { name: /log in/i }).click();
    cy.findByRole("link", { name: /TV/ }).click();
    cy.findByText(/Your Shows/i);
  });

  it("should check for non-matching passwords", () => {
    cy.login({ email });
    cy.visitAndCheck("/");

    cy.findByRole("link", { name: /account/i }).click();
    cy.findByRole("link", { name: /change password/i }).click();

    cy.findByLabelText(/current password/i).type("myreallystrongpassword");
    cy.findByLabelText(/new password/i).type(newPassword);
    cy.findByLabelText(/confirm password/i).type("foo");
    cy.findByRole("button", { name: /change password/i }).click();

    cy.findByLabelText(/new password/i).type(newPassword);
    cy.findByLabelText(/confirm password/i).type(newPassword);
    cy.findByRole("button", { name: /change password/i }).click();
  });
});

describe("password tests - logged out", () => {
  it("should ask for login before showing change password form", () => {
    cy.visitAndCheck("/password/change");
    cy.findByRole("link", { name: /log in/i });
  });
});
