import {
  checkRateLimit,
  clearRateLimitStore,
  getClientIp,
} from "./rate-limiter.server";

describe("rate-limiter.server", () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  describe("checkRateLimit", () => {
    it("allows first request within the limit", () => {
      const result = checkRateLimit("test-key", 5, 60_000);

      expect(result.limited).toBe(false);
      expect(result.retryAfterSeconds).toBe(0);
    });

    it("allows requests up to the limit", () => {
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit("test-key", 5, 60_000);
        expect(result.limited).toBe(false);
      }
    });

    it("blocks request when limit is exceeded", () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit("test-key", 5, 60_000);
      }

      const result = checkRateLimit("test-key", 5, 60_000);

      expect(result.limited).toBe(true);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("uses separate counters for different keys", () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit("key-a", 5, 60_000);
      }

      const resultA = checkRateLimit("key-a", 5, 60_000);
      const resultB = checkRateLimit("key-b", 5, 60_000);

      expect(resultA.limited).toBe(true);
      expect(resultB.limited).toBe(false);
    });

    it("resets the counter after the window expires", () => {
      for (let i = 0; i < 5; i++) {
        checkRateLimit("expiry-key", 5, 1);
      }

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = checkRateLimit("expiry-key", 5, 60_000);
          expect(result.limited).toBe(false);
          resolve();
        }, 10);
      });
    });

    it("returns retryAfterSeconds greater than 0 when limited", () => {
      for (let i = 0; i < 3; i++) {
        checkRateLimit("retry-key", 3, 60_000);
      }

      const result = checkRateLimit("retry-key", 3, 60_000);

      expect(result.limited).toBe(true);
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
    });
  });

  describe("getClientIp", () => {
    it("returns x-vercel-forwarded-for header when present", () => {
      const request = new Request("http://localhost/", {
        headers: { "x-vercel-forwarded-for": "1.2.3.4" },
      });

      expect(getClientIp(request)).toBe("1.2.3.4");
    });

    it("ignores x-forwarded-for and cf-connecting-ip when x-vercel-forwarded-for is present", () => {
      const request = new Request("http://localhost/", {
        headers: {
          "x-vercel-forwarded-for": "1.2.3.4",
          "x-forwarded-for": "5.6.7.8",
          "cf-connecting-ip": "9.10.11.12",
        },
      });

      expect(getClientIp(request)).toBe("1.2.3.4");
    });

    it("returns unknown when only other IP headers are present", () => {
      const request = new Request("http://localhost/", {
        headers: {
          "x-forwarded-for": "5.6.7.8",
          "cf-connecting-ip": "9.10.11.12",
        },
      });

      expect(getClientIp(request)).toBe("unknown");
    });

    it("returns unknown when no IP headers are present", () => {
      const request = new Request("http://localhost/");

      expect(getClientIp(request)).toBe("unknown");
    });
  });
});
