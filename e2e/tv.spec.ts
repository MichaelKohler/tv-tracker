import { faker } from "@faker-js/faker";

import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:8811/";

test.beforeEach(async ({ page }) => {
  await page.goto(BASE_URL);
});

test("allows TV flows", async ({ page }) => {
  const username = faker.internet.userName();

  // Signup
  await page.getByRole("link", { name: "Sign up" }).click();
  await page.getByLabel("Email address").fill(`${username}@example.com`);
  await page.getByLabel("Email address").press("Tab");
  await page.getByLabel("Password").fill("somePasswordIsVeryStrong123");
  await page.getByLabel("Password").press("Enter");
  await expect(page.getByText("Your Shows")).toBeVisible();

  await page.getByRole("link", { name: "TV", exact: true }).click();
  await page.getByPlaceholder("Search...").fill("House of the dragon");
  await page.getByPlaceholder("Search...").press("Enter");
  await expect(
    page.getByRole("heading", { name: "House of the Dragon", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Add Show" }).nth(0).click();
  await expect(page.getByText("Your Shows")).toBeVisible();

  await page.getByText("House of the Dragon").click();
  await expect(page.getByText("Remove show")).toBeVisible();
  await page.getByText("Mark as watched").nth(0).click();
  await page.getByText("Mark as not watched").nth(0).click();
  await page.getByText("Mark all aired episodes as watched").click();
  await expect(page.getByText("Mark as not watched").nth(0)).toBeVisible();
  await expect(page.getByText("Mark as watched")).not.toBeVisible();
  await page.getByText("Mark as not watched").nth(0).click();
  await expect(page.getByText("Mark as watched")).toBeVisible();

  await page.getByText("Remove show").click();
  await expect(
    page.getByText("You have not added any shows yet")
  ).toBeVisible();
});
