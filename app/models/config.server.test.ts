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
