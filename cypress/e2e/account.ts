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
    cy.findByRole("button", { name: /create account/i }).click();

    cy.findByRole("link", { name: /TV/ }).click();
    cy.findByText(/Your Shows/i);

    cy.findByRole("button", { name: /logout/i }).click();

    cy.findByRole("link", { name: /log in/i }).click();
    cy.findByRole("textbox", { name: /email/i }).type(loginForm.email);
    cy.findByLabelText(/password/i).type(loginForm.password);
    cy.findByRole("button", { name: /log in/i }).click();
    cy.findByRole("link", { name: /TV/ }).click();
    cy.findByText(/Your Shows/i);
  });
});

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
