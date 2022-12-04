import { validateEmail } from "./utils";

test("validateEmail returns false for non-emails", () => {
  expect(validateEmail(undefined)).equal(false);
  expect(validateEmail(null)).equal(false);
  expect(validateEmail("")).equal(false);
  expect(validateEmail("not-an-email")).equal(false);
  expect(validateEmail("n@")).equal(false);
});

test("validateEmail returns true for emails", () => {
  expect(validateEmail("kody@example.com")).equal(true);
});
