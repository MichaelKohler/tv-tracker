import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";

import {
  type Browser,
  type BrowserContext,
  type Page,
  expect,
  test,
} from "@playwright/test";

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
  await page.getByRole("link", { name: "Account", exact: true }).click();
  await page.getByRole("button", { name: "Add Passkey" }).click();
  await page.getByLabel("Passkey Name").fill(name);
  await page.getByLabel("Confirm with your password").fill(PASSWORD);
  await page.getByRole("button", { name: "Register Passkey" }).click();
  await expect(
    page.getByText("Passkey registered successfully!")
  ).toBeVisible();
}

async function addPasskeyRow(email: string, name: string) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const { id: userId } = await prisma.user.findUniqueOrThrow({
    where: { email: email.toLowerCase() },
  });
  await prisma.passkey.create({
    data: {
      userId,
      name,
      credentialId: faker.string.uuid(),
      publicKey: Buffer.from([1]),
      counter: 0,
      transports: [],
    },
  });
  await prisma.$disconnect();
}

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";
const EXPIRED_RESET_LINK = "Password reset link expired. Please try again.";

async function logOut(page: Page) {
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeHidden();
}

async function requestPasswordReset(page: Page, email: string) {
  await page.goto("/password/reset");
  await page.getByLabel("Email address").fill(email);
  const sendButton = page.getByRole("button", {
    name: "Send password reset email",
  });
  await sendButton.click();
  await expect(sendButton).toBeDisabled();
}

async function getPasswordResetLinks(
  page: Page,
  email: string,
  expectedCount: number
) {
  const inbox = await page.context().newPage();
  const messages = inbox.getByRole("link", {
    name: /Password Reset Request/,
  });
  await expect(async () => {
    await inbox.goto(
      `${MAILPIT_URL}/search?q=${encodeURIComponent(`to:"${email}"`)}`
    );
    await expect(messages).toHaveCount(expectedCount, { timeout: 1000 });
  }).toPass();

  const links: string[] = [];
  for (let index = 0; index < expectedCount; index++) {
    await messages.nth(index).click();
    const href = await inbox
      .getByRole("tabpanel", { name: "HTML" })
      .locator("iframe")
      .contentFrame()
      .getByRole("link", { name: /\/account\?token=/ })
      .getAttribute("href");
    const { pathname, search } = new URL(href!);
    links.push(`${pathname}${search}`);
    await inbox.goBack();
  }
  await inbox.close();
  return links;
}

async function resetPasswordWithLink(
  page: Page,
  link: string,
  newPassword: string
) {
  await page.goto(link);
  await page.getByLabel("New Password").fill(newPassword);
  await page.getByLabel("Confirm Password").fill(newPassword);
  await page.getByRole("button", { name: "Change password" }).click();
}

function uniqueClientIpHeaders() {
  return { "x-vercel-forwarded-for": faker.internet.ipv4() };
}

function newOtherDevice(browser: Browser, baseURL: string | undefined) {
  return browser.newContext({
    baseURL,
    extraHTTPHeaders: uniqueClientIpHeaders(),
  });
}

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders(uniqueClientIpHeaders());
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

async function expectCookiesToBeRevoked(
  page: Page,
  cookies: Awaited<ReturnType<BrowserContext["cookies"]>>
) {
  await page.context().addCookies(cookies);
  await page.goto("/tv");
  await expect(page).toHaveURL(/\/login/);
}

async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL("/tv");
}

test("does not accept a copied session cookie after logout", async ({
  context,
  page,
}) => {
  await signUp(page, `${faker.internet.username()}@example.com`);
  const copiedCookies = await context.cookies();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeHidden();

  await expectCookiesToBeRevoked(page, copiedCookies);
});

test("keeps other devices logged in when logging out on one", async ({
  baseURL,
  browser,
  page,
}) => {
  const email = `${faker.internet.username()}@example.com`;
  await signUp(page, email);

  const otherDevice = await newOtherDevice(browser, baseURL);
  const otherPage = await otherDevice.newPage();
  await logIn(otherPage, email, PASSWORD);

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeHidden();

  await otherPage.goto("/tv");
  await expect(otherPage).toHaveURL("/tv");
  await otherDevice.close();
});

test("logs out every device when logging out all devices", async ({
  baseURL,
  browser,
  context,
  page,
}) => {
  const email = `${faker.internet.username()}@example.com`;
  await signUp(page, email);
  const copiedCookies = await context.cookies();

  const otherDevice = await newOtherDevice(browser, baseURL);
  const otherPage = await otherDevice.newPage();
  await logIn(otherPage, email, PASSWORD);

  await page.getByRole("link", { name: "Account" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Log out all devices" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("button", { name: "Logout" })).toBeHidden();

  await otherPage.goto("/tv");
  await expect(otherPage).toHaveURL(/\/login/);
  await otherDevice.close();

  await expectCookiesToBeRevoked(page, copiedCookies);
});

test("revokes old sessions but keeps this device logged in after a password change", async ({
  baseURL,
  browser,
  context,
  page,
}) => {
  const email = `${faker.internet.username()}@example.com`;
  const newPassword = "someNewVeryStrongPassword4321";
  await signUp(page, email);
  const copiedCookies = await context.cookies();

  const otherDevice = await newOtherDevice(browser, baseURL);
  const otherPage = await otherDevice.newPage();
  await logIn(otherPage, email, PASSWORD);

  await page.getByRole("link", { name: "Account" }).click();
  await page.getByLabel("Current Password").fill(PASSWORD);
  await page.getByLabel("New Password").fill(newPassword);
  await page.getByLabel("Confirm Password").fill(newPassword);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Your password has been changed.")).toBeVisible();

  await page.goto("/tv");
  await expect(page).toHaveURL("/tv");

  await otherPage.goto("/tv");
  await expect(otherPage).toHaveURL(/\/login/);
  await otherDevice.close();

  await expectCookiesToBeRevoked(page, copiedCookies);
});

test("stays on the app when login redirectTo points to another origin", async ({
  page,
}) => {
  const email = `${faker.internet.username()}@example.com`;

  await signUp(page, email);

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(
    page.getByRole("main").getByRole("link", { name: "Log In" })
  ).toBeVisible();

  await page.goto("/login?redirectTo=/%5Cevil.com");
  await page.getByLabel("Email address").fill(email);
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

  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByLabel("Confirm with your password").fill("notThePassword123");
  await page.getByRole("button", { name: "Delete passkey" }).click();
  await expect(page.getByRole("alert")).toHaveText("Incorrect password");
  await expect(
    page.getByRole("heading", { name: "My Deletable Passkey" })
  ).toBeVisible();

  await page.getByLabel("Confirm with your password").fill(PASSWORD);
  await page.getByRole("button", { name: "Delete passkey" }).click();

  await expect(
    page.getByRole("heading", { name: "My Deletable Passkey" })
  ).not.toBeVisible();
});

test("requires a passkey to delete a passkey without a password", async ({
  context,
  page,
}) => {
  await context.credentials.install();

  const email = `${faker.internet.username()}@example.com`;
  await signUp(page, email);
  await registerPasskey(page, "First Passkey");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Remove Password" }).click();
  await expect(page.getByText("You don't have a password set.")).toBeVisible();

  await addPasskeyRow(email, "Second Passkey");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Second Passkey" })
  ).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Delete", exact: true })
    .first()
    .click();

  await expect(
    page.getByRole("heading", { name: "Second Passkey" })
  ).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "First Passkey" })
  ).toBeVisible();
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

test("resets the Plex token and shows the new webhook URL", async ({
  page,
}) => {
  await signUp(page, `${faker.internet.username()}@example.com`);
  await page.getByRole("link", { name: "Account", exact: true }).click();

  const webhookLink = page.getByRole("link", { name: /\/plex\// });
  const oldWebhookUrl = await webhookLink.textContent();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset token" }).click();

  await expect(
    page.getByText("Plex token reset. Update the webhook URL in Plex.")
  ).toBeVisible();
  await expect(webhookLink).not.toHaveText(oldWebhookUrl ?? "");
  await expect(webhookLink).toHaveText(/\/plex\/[0-9a-f-]{36}$/);
});

test.describe("password reset links", () => {
  const NEW_PASSWORD = "someResetVeryStrongPassword4321";

  test("does not accept a reset link a second time", async ({
    baseURL,
    browser,
    page,
  }) => {
    const email = `${faker.internet.username()}@example.com`;
    await signUp(page, email);
    await logOut(page);
    await requestPasswordReset(page, email);
    const [link] = await getPasswordResetLinks(page, email, 1);

    await resetPasswordWithLink(page, link, NEW_PASSWORD);
    await expect(
      page.getByText("Your password has been changed.")
    ).toBeVisible();

    const otherDevice = await newOtherDevice(browser, baseURL);
    const otherPage = await otherDevice.newPage();
    await resetPasswordWithLink(otherPage, link, PASSWORD);
    await expect(otherPage.getByText(EXPIRED_RESET_LINK)).toBeVisible();
    await otherDevice.close();

    await logIn(page, email, NEW_PASSWORD);
  });

  test("revokes a pending reset link when the password is changed in the account", async ({
    page,
  }) => {
    const email = `${faker.internet.username()}@example.com`;
    await signUp(page, email);
    await logOut(page);
    await requestPasswordReset(page, email);
    const [link] = await getPasswordResetLinks(page, email, 1);

    await logIn(page, email, PASSWORD);
    await page.getByRole("link", { name: "Account" }).click();
    await page.getByLabel("Current Password").fill(PASSWORD);
    await page.getByLabel("New Password").fill(NEW_PASSWORD);
    await page.getByLabel("Confirm Password").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(
      page.getByText("Your password has been changed.")
    ).toBeVisible();
    await logOut(page);

    await resetPasswordWithLink(page, link, PASSWORD);
    await expect(page.getByText(EXPIRED_RESET_LINK)).toBeVisible();
  });

  test("only accepts the newest reset link", async ({ page }) => {
    const email = `${faker.internet.username()}@example.com`;
    await signUp(page, email);
    await logOut(page);
    await requestPasswordReset(page, email);
    await getPasswordResetLinks(page, email, 1);
    await requestPasswordReset(page, email);
    const [newestLink, olderLink] = await getPasswordResetLinks(page, email, 2);

    await resetPasswordWithLink(page, olderLink, NEW_PASSWORD);
    await expect(page.getByText(EXPIRED_RESET_LINK)).toBeVisible();

    await resetPasswordWithLink(page, newestLink, NEW_PASSWORD);
    await expect(
      page.getByText("Your password has been changed.")
    ).toBeVisible();
  });

  test("shows the expired link message after the account was deleted", async ({
    page,
  }) => {
    const email = `${faker.internet.username()}@example.com`;
    await signUp(page, email);
    await logOut(page);
    await requestPasswordReset(page, email);
    const [link] = await getPasswordResetLinks(page, email, 1);

    await logIn(page, email, PASSWORD);
    await page.getByRole("link", { name: "Account" }).click();
    await page
      .getByRole("link", { name: "Delete my account and all data" })
      .click();
    await page.getByLabel("Confirm with password").fill(PASSWORD);
    await page
      .getByRole("button", { name: "Delete my account and all data" })
      .click();
    await expect(page.getByText("What have you watched?")).toBeVisible();

    await resetPasswordWithLink(page, link, NEW_PASSWORD);
    await expect(page.getByText(EXPIRED_RESET_LINK)).toBeVisible();
    await expect(
      page.getByText("Something went wrong. Please try again.")
    ).toBeHidden();
  });
});
