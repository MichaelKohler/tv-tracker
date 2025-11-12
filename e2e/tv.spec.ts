import { faker } from "@faker-js/faker";

import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("allows TV flows", async ({ page }) => {
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

  // Navigate to TV search and wait for the page to load
  await page.getByRole("link", { name: "TV", exact: true }).click();
  await page.waitForURL("/tv");

  // Search for a show and wait for results
  await page.getByPlaceholder("Search...").fill("House of the dragon");

  await Promise.all([
    page.getByPlaceholder("Search...").press("Enter"),
    page.waitForResponse(
      (resp) => resp.url().includes("/tv/search") && resp.status() === 200
    ),
  ]);

  await expect(
    page.getByRole("heading", { name: "House of the Dragon", exact: true })
  ).toBeVisible();

  // Add show and wait for navigation back to TV page
  await Promise.all([
    page.getByRole("button", { name: "Add Show" }).nth(0).click(),
    page.waitForURL("/tv"),
  ]);

  await expect(page.getByText("Your shows")).toBeVisible();

  await page.getByText("House of the Dragon").click();
  await expect(page.getByText("Remove show")).toBeVisible();

  await page.getByText("Ignore", { exact: true }).nth(0).click();
  await expect(page.getByText("Unignore").nth(0)).toBeVisible();
  await page.getByText("Unignore").nth(0).click();
  await expect(page.getByText("Ignore", { exact: true }).nth(0)).toBeVisible();

  await page.getByText("Mark as watched").nth(0).click();
  await page.getByText("Mark as not watched").nth(0).click();

  await page.getByText("Mark all aired episodes as watched").click();
  await expect(page.getByText("Mark as not watched").nth(0)).toBeVisible();
  await page.getByText("Mark as not watched").nth(0).click();

  await expect(page.getByRole("button", { name: "Archive" })).toBeVisible();

  await page.getByText("Remove show").click();
  await expect(
    page.getByText("You have not added any shows yet")
  ).toBeVisible();
});
