import { faker } from "@faker-js/faker";

import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("allows signup and login", async ({ page }) => {
  const username = faker.internet.username();

  await page.getByRole("main").getByRole("link", { name: "Sign up" }).click();

  await page.getByLabel("Email address").fill(`${username}@example.com`);
  await page.getByLabel("Email address").press("Tab");

  await page.getByLabel("Password").fill("somePasswordIsVeryStrong123");

  // Wait for the form submission and navigation
  await Promise.all([
    page.getByLabel("Password").press("Enter"),
    page.waitForURL("/tv"),
  ]);

  await expect(page.getByText("Your shows")).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();

  await page.getByRole("main").getByRole("link", { name: "Log In" }).click();
  await page.getByLabel("Email address").fill(`${username}@example.com`);
  await page.getByLabel("Email address").press("Tab");

  await page.getByLabel("Password").fill("somePasswordIsVeryStrong123");

  // Wait for the form submission and navigation
  await Promise.all([
    page.getByRole("button", { name: "Log in" }).click(),
    page.waitForURL("/tv"),
  ]);

  await expect(page.getByText("Your shows")).toBeVisible();
});

test("allows going from signup to login", async ({ page }) => {
  await page.getByRole("main").getByRole("link", { name: "Sign up" }).click();

  await page.getByRole("link", { name: "Log in", exact: true }).click();
});

test("allows to delete account", async ({ page }) => {
  const username = faker.internet.username();

  // Signup
  await page.getByRole("main").getByRole("link", { name: "Sign up" }).click();
  await page.getByLabel("Email address").fill(`${username}@example.com`);
  await page.getByLabel("Email address").press("Tab");
  await page.getByLabel("Password").fill("somePasswordIsVeryStrong123");

  // Wait for the form submission and navigation
  await Promise.all([
    page.getByLabel("Password").press("Enter"),
    page.waitForURL("/tv"),
  ]);

  await expect(page.getByText("Your shows")).toBeVisible();

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
  await page
    .getByRole("button", { name: "Delete my account and all data" })
    .click();
  await expect(page.getByText("What have you watched?")).toBeVisible();
});

test("allows to change password", async ({ page }) => {
  const username = faker.internet.username();

  // Signup
  await page.getByRole("main").getByRole("link", { name: "Sign up" }).click();
  await page.getByLabel("Email address").fill(`${username}@example.com`);
  await page.getByLabel("Email address").press("Tab");
  await page.getByLabel("Password").fill("somePasswordIsVeryStrong123");

  // Wait for the form submission and navigation
  await Promise.all([
    page.getByLabel("Password").press("Enter"),
    page.waitForURL("/tv"),
  ]);

  await expect(page.getByText("Your shows")).toBeVisible();

  await page.getByRole("link", { name: "Account" }).click();
  await page.getByLabel("Current Password").fill("somePasswordIsVeryStrong123");
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
  await page.getByLabel("Email address").fill(`${username}@example.com`);
  await page.getByLabel("Email address").press("Tab");
  await page.getByLabel("Password").fill("someNewVeryStrongPassword4321");

  // Wait for the form submission and navigation
  await Promise.all([
    page.getByRole("button", { name: "Log in" }).click(),
    page.waitForURL("/tv"),
  ]);

  await expect(page.getByText("Your shows")).toBeVisible();
});

test("recognizes not matching password", async ({ page }) => {
  const username = faker.internet.username();

  // Signup
  await page.getByRole("main").getByRole("link", { name: "Sign up" }).click();
  await page.getByLabel("Email address").fill(`${username}@example.com`);
  await page.getByLabel("Email address").press("Tab");
  await page.getByLabel("Password").fill("somePasswordIsVeryStrong123");

  // Wait for the form submission and navigation
  await Promise.all([
    page.getByLabel("Password").press("Enter"),
    page.waitForURL("/tv"),
  ]);

  await expect(page.getByText("Your shows")).toBeVisible();

  await page.getByRole("link", { name: "Account" }).click();
  await page.getByLabel("Current Password").fill("somePasswordIsVeryStrong123");
  await page.getByLabel("Current Password").press("Tab");
  await page.getByLabel("New Password").fill("someNewVeryStrongPassword4321");
  await page.getByLabel("New Password").press("Tab");
  await page.getByLabel("Confirm Password").fill("thisISnotMATCHINGandFAILS");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Passwords do not match")).toBeVisible();
});
