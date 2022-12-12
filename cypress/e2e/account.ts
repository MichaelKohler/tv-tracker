import { faker } from "@faker-js/faker";

describe("account deletion tests", () => {
  it("should allow to delete account with confirmation", () => {
    cy.login();
    cy.visitAndCheck("/");

    cy.findByRole("link", { name: /account/i }).click();

    cy.findByRole("link", {
      name: /delete my account and all data/i,
    }).click();

    // Confirmation page
    cy.findByRole("button", {
      name: /delete my account and all data/i,
    }).click();

    // Should be able to directly sign up again
    const loginForm = {
      email: `${faker.internet.userName()}@example.com`,
      password: faker.internet.password(),
    };

    cy.findByRole("link", { name: /sign up/i }).click();
    cy.findByRole("textbox", { name: /email/i }).type(loginForm.email);
    cy.findByLabelText(/password/i).type(loginForm.password);
    cy.findByRole("button", { name: /create account/i }).click();
  });
});
