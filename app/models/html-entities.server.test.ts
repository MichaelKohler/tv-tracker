import { decodeHtmlEntities } from "./html-entities.server";

test("decodeHtmlEntities decodes HTML entities", () => {
  expect(decodeHtmlEntities("a &lt; b")).toBe("a < b");
  expect(decodeHtmlEntities("a &amp; b")).toBe("a & b");
  expect(decodeHtmlEntities("a &quot; b")).toBe('a " b');
  expect(decodeHtmlEntities("a &apos; b")).toBe("a ' b");
});

test("decodeHtmlEntities returns empty string for null input", () => {
  expect(decodeHtmlEntities(null)).toBe("");
});
