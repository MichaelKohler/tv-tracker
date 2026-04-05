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

  await page.getByLabel("Password").press("Enter");
  await expect(page).toHaveURL("/tv");

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
  await page.getByRole("button", { name: "Add Show" }).nth(0).click();
  await expect(page).toHaveURL("/tv");

  await expect(page.getByText("Your shows")).toBeVisible();

  await page.getByText("House of the Dragon").click();
  await expect(page.getByText("Remove show")).toBeVisible();

  await page.getByText("Ignore", { exact: true }).nth(0).click();
  await expect(page.getByText("Unignore").nth(0)).toBeVisible();
  await page.getByText("Unignore").nth(0).click();
  await expect(page.getByText("Ignore", { exact: true }).nth(0)).toBeVisible();

  await page.getByText("Mark as watched").nth(0).click();
  await page.getByText("Mark as not watched").nth(0).click();
  // Wait for MARK_UNWATCHED loader: ep0 is now unwatched, so no "Mark as not watched"
  // buttons remain. This confirms the component has re-rendered with settled data
  // before we click "Mark all", avoiding a stale-element click.
  await expect(page.getByText("Mark as not watched")).not.toBeVisible();

  await page.getByText("Mark all aired episodes as watched").click();
  // Wait for MARK_ALL_WATCHED loader: all episodes are watched, so "Mark as not
  // watched" buttons appear. This confirms the action + loader completed successfully.
  await expect(page.getByText("Mark as not watched").first()).toBeVisible();
  await page.getByText("Mark as not watched").nth(0).click();

  // Wait for MARK_UNWATCHED loader: first episode transitions back to "Mark as watched",
  // confirming the component has re-rendered with fresh data before clicking "Remove show".
  await expect(
    page
      .getByRole("listitem")
      .first()
      .getByRole("button", { name: "Mark as watched" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Remove show" }).click();
  await expect(page).toHaveURL("/tv");
  await expect(
    page.getByText("You have not added any shows yet")
  ).toBeVisible();
});
