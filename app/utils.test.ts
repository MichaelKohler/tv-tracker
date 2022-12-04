import { padNumber, validateEmail } from "./utils";

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

test("padNumber returns same number if no padding needed", () => {
  expect(padNumber(10)).equal("10");
  expect(padNumber(100)).equal("100");
  expect(padNumber(1000)).equal("1000");
});

test("padNumber returns padded number", () => {
  expect(padNumber(1)).equal("01");
  expect(padNumber(9)).equal("09");
});
