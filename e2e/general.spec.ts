import { test, expect } from "@playwright/test";

test("has correct title", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("tv-tracker");
});

test("has correct main content", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("What have you watched?")).toBeVisible();
  await expect(
    page.getByText(
      "Never lose track of your favorite TV shows again. Search for new shows, track your progress and see what's coming up next."
    )
  ).toBeVisible();
});
