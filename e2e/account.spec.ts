import { faker } from "@faker-js/faker";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const PASSWORD = "somePasswordIsVeryStrong123";

async function signUp(page: Page, email: string) {
  await page.getByRole("main").getByRole("link", { name: "Sign up" }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Email address").press("Tab");
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByLabel("Password").press("Enter");
  await expect(page).toHaveURL("/tv");
  await expect(page.getByText("Your shows")).toBeVisible();
}

async function registerPasskey(page: Page, name: string) {
  await page.getByRole("link", { name: "Account" }).click();
  await page.getByRole("button", { name: "Add Passkey" }).click();
  await page.getByLabel("Passkey Name").fill(name);
  await page.getByLabel("Confirm with your password").fill(PASSWORD);
  await page.getByRole("button", { name: "Register Passkey" }).click();
  await expect(
    page.getByText("Passkey registered successfully!")
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("allows signup and login", async ({ page }) => {
  const email = `${faker.internet.username()}@example.com`;

  await signUp(page, email);

  await page.getByRole("button", { name: "Logout" }).click();

  await page.getByRole("main").getByRole("link", { name: "Log In" }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Email address").press("Tab");

  await page.getByLabel("Password").fill(PASSWORD);

  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL("/tv");

  await expect(page.getByText("Your shows")).toBeVisible();
});

test("allows going from signup to login", async ({ page }) => {
  await page.getByRole("main").getByRole("link", { name: "Sign up" }).click();

  await page.getByRole("link", { name: "Log in", exact: true }).click();
});

test("allows to delete account", async ({ page }) => {
  await signUp(page, `${faker.internet.username()}@example.com`);

  await page.getByRole("link", { name: "Account" }).click();
  await expect(
    page.getByText("Deleting your account will also delete all your saved data")
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Delete my account and all data" })
    .click();
  await expect(
    page.getByText("Are you sure you want to delete your account?")
  ).toBeVisible();
  await page.getByLabel("Confirm with password").fill(PASSWORD);
  await page
    .getByRole("button", { name: "Delete my account and all data" })
    .click();
  await expect(page.getByText("What have you watched?")).toBeVisible();
});

test("allows to change password", async ({ page }) => {
  const email = `${faker.internet.username()}@example.com`;

  await signUp(page, email);

  await page.getByRole("link", { name: "Account" }).click();
  await page.getByLabel("Current Password").fill(PASSWORD);
  await page.getByLabel("Current Password").press("Tab");
  await page.getByLabel("New Password").fill("someNewVeryStrongPassword4321");
  await page.getByLabel("New Password").press("Tab");
  await page
    .getByLabel("Confirm Password")
    .fill("someNewVeryStrongPassword4321");

  await Promise.all([
    page.getByRole("button", { name: "Change password" }).click(),
    page.waitForResponse(
      (response) =>
        response.url().includes("/account") &&
        response.request().method() === "POST"
    ),
  ]);

  await expect(page.getByText("Your password has been changed.")).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await page.getByRole("main").getByRole("link", { name: "Log In" }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Email address").press("Tab");
  await page.getByLabel("Password").fill("someNewVeryStrongPassword4321");

  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL("/tv");

  await expect(page.getByText("Your shows")).toBeVisible();
});

test("allows to register a passkey", async ({ context, page }) => {
  await context.credentials.install();

  const email = `${faker.internet.username()}@example.com`;
  await signUp(page, email);
  await registerPasskey(page, "My Registration Passkey");

  await expect(
    page.getByRole("heading", { name: "My Registration Passkey" })
  ).toBeVisible();
});

test("allows to delete a passkey", async ({ context, page }) => {
  await context.credentials.install();

  const email = `${faker.internet.username()}@example.com`;
  await signUp(page, email);
  await registerPasskey(page, "My Deletable Passkey");

  await expect(
    page.getByRole("heading", { name: "My Deletable Passkey" })
  ).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "My Deletable Passkey" })
  ).not.toBeVisible();
});

test("allows login with a passkey", async ({ context, page }) => {
  await context.credentials.install();

  const email = `${faker.internet.username()}@example.com`;
  await signUp(page, email);
  await registerPasskey(page, "My Login Passkey");

  await page.getByRole("button", { name: "Logout" }).click();

  await page.getByRole("main").getByRole("link", { name: "Log In" }).click();
  await page.getByRole("button", { name: "Sign in with Passkey" }).click();

  await expect(page).toHaveURL("/tv");
  await expect(page.getByText("Your shows")).toBeVisible();
});

test("recognizes not matching password", async ({ page }) => {
  await signUp(page, `${faker.internet.username()}@example.com`);

  await page.getByRole("link", { name: "Account" }).click();
  await page.getByLabel("Current Password").fill(PASSWORD);
  await page.getByLabel("Current Password").press("Tab");
  await page.getByLabel("New Password").fill("someNewVeryStrongPassword4321");
  await page.getByLabel("New Password").press("Tab");
  await page.getByLabel("Confirm Password").fill("thisISnotMATCHINGandFAILS");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Passwords do not match")).toBeVisible();
});
