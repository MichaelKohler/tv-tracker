import { faker } from "@faker-js/faker";

describe("login tests", () => {
  afterEach(() => {
    cy.cleanupUser();
  });

  it("should allow you to register and login", () => {
    const loginForm = {
      email: `${faker.internet.userName()}@example.com`,
      password: faker.internet.password(),
      username: faker.hacker.noun(),
    };
    cy.then(() => ({ email: loginForm.email })).as("user");

    cy.visitAndCheck("/");

    cy.findByRole("link", { name: /sign up/i }).click();
    cy.findByRole("textbox", { name: /email/i }).type(loginForm.email);
    cy.findByLabelText(/password/i).type(loginForm.password);
    cy.findByRole("textbox", { name: /username/i }).type(loginForm.username);
    cy.findByRole("button", { name: /create account/i }).click();

    cy.findByRole("link", { name: /trips/i }).click();
    cy.findByText(/no trip selected/i);

    cy.findByRole("button", { name: /logout/i }).click();

    cy.findByRole("link", { name: /log in/i }).click();
    cy.findByRole("textbox", { name: /email/i }).type(loginForm.email);
    cy.findByLabelText(/password/i).type(loginForm.password);
    cy.findByRole("button", { name: /log in/i }).click();
    cy.findByRole("link", { name: /trips/i }).click();
  });
});
