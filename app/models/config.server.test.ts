import { getFlagsFromEnvironment } from "./config.server";

test("returns correct signup disabled value when set to true - string", async () => {
  process.env.SIGNUP_DISABLED = "true";
  const { SIGNUP_DISABLED } = getFlagsFromEnvironment();
  expect(SIGNUP_DISABLED).toBe(true);
});

test("returns correct signup disabled value when set to something else", async () => {
  process.env.SIGNUP_DISABLED = "this-is-something-else";
  const { SIGNUP_DISABLED } = getFlagsFromEnvironment();
  expect(SIGNUP_DISABLED).toBe(false);
});

test("returns correct signup disabled value when set to false", async () => {
  process.env.SIGNUP_DISABLED = "false";
  const { SIGNUP_DISABLED } = getFlagsFromEnvironment();
  expect(SIGNUP_DISABLED).toBe(false);
});

test("returns correct signup disabled value when not set", async () => {
  const { SIGNUP_DISABLED } = getFlagsFromEnvironment();
  expect(SIGNUP_DISABLED).toBe(false);
});

test("returns correct maintenance mode value when set to true - string", async () => {
  process.env.MAINTENANCE_MODE_ENABLED = "true";
  const { MAINTENANCE_MODE_ENABLED } = getFlagsFromEnvironment();
  expect(MAINTENANCE_MODE_ENABLED).toBe(true);
});

test("returns correct maintenance mode value when set to something else", async () => {
  process.env.MAINTENANCE_MODE_ENABLED = "this-is-something-else";
  const { MAINTENANCE_MODE_ENABLED } = getFlagsFromEnvironment();
  expect(MAINTENANCE_MODE_ENABLED).toBe(false);
});

test("returns correct maintenance mode value when set to false", async () => {
  process.env.MAINTENANCE_MODE_ENABLED = "false";
  const { MAINTENANCE_MODE_ENABLED } = getFlagsFromEnvironment();
  expect(MAINTENANCE_MODE_ENABLED).toBe(false);
});

test("returns correct maintenance mode value when not set", async () => {
  const { MAINTENANCE_MODE_ENABLED } = getFlagsFromEnvironment();
  expect(MAINTENANCE_MODE_ENABLED).toBe(false);
});
