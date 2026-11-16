import { decodeHtmlEntities, htmlToPlainText } from "./html-entities.server";

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

  it("strips tags and decodes HTML entities", () => {
    expect(htmlToPlainText("<p>Tom &amp; Jerry&#39;s <b>show</b></p>")).toBe(
      "Tom & Jerry's show"
    );
  });

  it("returns empty string for missing HTML", () => {
    expect(htmlToPlainText(null)).toBe("");
    expect(htmlToPlainText(undefined)).toBe("");
  });
});
