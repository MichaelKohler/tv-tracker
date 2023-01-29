import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:8811/";

test("has correct title", async ({ page }) => {
  await page.goto(BASE_URL);

  await expect(page).toHaveTitle("tv-tracker");
});

test("has correct main content", async ({ page }) => {
  await page.goto(BASE_URL);

  await expect(page.getByText("What have you watched?")).toBeVisible();
  await expect(page.getByText("Track your watched TV shows")).toBeVisible();
});
