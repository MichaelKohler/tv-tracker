import { decodeHtmlEntities } from "./html-entities.server";

describe("HTML Entities", () => {
  it("decodes HTML entities", () => {
    expect(decodeHtmlEntities("a &lt; b")).toBe("a < b");
    expect(decodeHtmlEntities("a &amp; b")).toBe("a & b");
    expect(decodeHtmlEntities("a &quot; b")).toBe('a " b');
    expect(decodeHtmlEntities("a &apos; b")).toBe("a ' b");
  });

  it("returns empty string for null input", () => {
    expect(decodeHtmlEntities(null)).toBe("");
  });
});
