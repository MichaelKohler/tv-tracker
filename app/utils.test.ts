import {
  padNumber,
  validateEmail,
  validatePassword,
  getPasswordValidationError,
  sanitizeInput,
  validateAndSanitizeEmail,
} from "./utils";

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

test("validatePassword returns false for invalid passwords", () => {
  expect(validatePassword(undefined)).equal(false);
  expect(validatePassword(null)).equal(false);
  expect(validatePassword("")).equal(false);
  expect(validatePassword("short")).equal(false);
  expect(validatePassword("1234567")).equal(false); // 7 characters
});

test("validatePassword returns true for valid passwords", () => {
  expect(validatePassword("12345678")).equal(true); // 8 characters
  expect(validatePassword("simplepassword")).equal(true);
  expect(validatePassword("password123")).equal(true);
  expect(validatePassword("UPPERCASE")).equal(true);
  expect(validatePassword("special!@#$")).equal(true);
});

test("getPasswordValidationError returns correct error messages", () => {
  expect(getPasswordValidationError(undefined)).equal("Password is required");
  expect(getPasswordValidationError(null)).equal("Password is required");
  expect(getPasswordValidationError("")).equal("Password is required");
  expect(getPasswordValidationError("short")).equal(
    "Password must be at least 8 characters long"
  );
  expect(getPasswordValidationError("1234567")).equal(
    "Password must be at least 8 characters long"
  );
});

test("getPasswordValidationError returns null for valid passwords", () => {
  expect(getPasswordValidationError("12345678")).equal(null);
  expect(getPasswordValidationError("simplepassword")).equal(null);
  expect(getPasswordValidationError("password123")).equal(null);
});

test("sanitizeInput removes control characters and trims", () => {
  expect(sanitizeInput("normal text")).equal("normal text");
  expect(sanitizeInput("  spaced  ")).equal("spaced");
  expect(sanitizeInput("text\x00with\x1Fcontrol")).equal("textwithcontrol");
  expect(sanitizeInput("text\x7Fwith\x01more")).equal("textwithmore");
});

test("sanitizeInput handles non-string input", () => {
  expect(sanitizeInput(undefined)).equal("");
  expect(sanitizeInput(null)).equal("");
  expect(sanitizeInput(123)).equal("");
  expect(sanitizeInput({})).equal("");
});

test("validateAndSanitizeEmail returns sanitized email for valid input", () => {
  expect(validateAndSanitizeEmail("TEST@EXAMPLE.COM")).equal(
    "test@example.com"
  );
  expect(validateAndSanitizeEmail("  user@domain.com  ")).equal(
    "user@domain.com"
  );
  expect(validateAndSanitizeEmail("User.Name@Example.Org")).equal(
    "user.name@example.org"
  );
});

test("validateAndSanitizeEmail returns null for invalid input", () => {
  expect(validateAndSanitizeEmail("invalid")).equal(null);
  expect(validateAndSanitizeEmail("")).equal(null);
  expect(validateAndSanitizeEmail(null)).equal(null);
  expect(validateAndSanitizeEmail(undefined)).equal(null);
  expect(validateAndSanitizeEmail("not-an-email")).equal(null);
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
