import { vi, beforeEach, afterEach } from "vitest";

// Create hoisted mocks
const mockVariantFn = vi.hoisted(() => vi.fn());
const mockBooleanFn = vi.hoisted(() => vi.fn());
const mockGetUserId = vi.hoisted(() => vi.fn());

// Mock the Flipt module
vi.mock("@flipt-io/flipt", async () => ({
  ...(await vi.importActual("@flipt-io/flipt")),
  FliptClient: vi.fn(
    class {
      evaluation = {
        variant: mockVariantFn,
        boolean: mockBooleanFn,
      };
    }
  ),
  AuthenticationStrategy: vi.fn(
    class {
      authenticate = vi
        .fn()
        .mockReturnValue(new Map([["Authorization", "Basic test-token"]]));
    }
  ),
}));

vi.mock("../db.server");

// We don't want to mock partially here, as otherwise
// we need to make sure that none of the other functions
// of this module are calling out to the database.
vi.mock("./session.server", async () => ({
  getUserId: mockGetUserId,
}));

// Import after mocking the flipt client
import {
  FLAGS,
  DEFAULT_FLAG_VALUES,
  evaluateVariant,
  evaluateBoolean,
  evaluateBooleanFromScripts,
} from "./flags.server";

// Store original environment variables
const originalEnv = process.env;

// Create a mock request object
const mockRequest = new Request("http://localhost:3000/test");

describe("Flags", () => {
  beforeEach(() => {
    // Only clearing as otherwise we'd have to re-mock the entire module
    vi.clearAllMocks();
    // Reset environment variables
    process.env = { ...originalEnv };
    // Set up default mock return value for getUserId
    mockGetUserId.mockResolvedValue("test-user-id");
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("FLAGS constant", () => {
    it("FLAGS is an object", () => {
      expect(typeof FLAGS).equal("object");
    });
  });

  describe("evaluateVariant", () => {
    it("returns true when FLIPT_ENVIRONMENT is empty", async () => {
      process.env.FLIPT_ENVIRONMENT = "";

      const result = await evaluateVariant(mockRequest, "test-flag");

      expect(result).equal(true);
      expect(mockVariantFn).not.toHaveBeenCalled();
      expect(mockGetUserId).not.toHaveBeenCalled();
    });

    it("calls flipt client when FLIPT_ENVIRONMENT is set", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      const mockResponse = { variant: "test-variant" };
      mockVariantFn.mockResolvedValue(mockResponse);

      const result = await evaluateVariant(mockRequest, "test-flag");

      expect(result).equal(mockResponse);
      expect(mockGetUserId).toHaveBeenCalledWith(mockRequest);
      expect(mockVariantFn).toHaveBeenCalledWith({
        namespaceKey: "default",
        flagKey: "test-flag",
        entityId: "test-user-id",
        context: {},
      });
    });

    it("handles different flag names", async () => {
      process.env.FLIPT_ENVIRONMENT = "test";
      mockVariantFn.mockResolvedValue({ variant: "test-variant" });

      await evaluateVariant(mockRequest, "another-flag");

      expect(mockVariantFn).toHaveBeenCalledWith({
        namespaceKey: "default",
        flagKey: "another-flag",
        entityId: "test-user-id",
        context: {},
      });
    });

    it("handles null user ID", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      mockGetUserId.mockResolvedValue(null);
      mockVariantFn.mockResolvedValue({ variant: "test-variant" });

      await evaluateVariant(mockRequest, "test-flag");

      expect(mockVariantFn).toHaveBeenCalledWith({
        namespaceKey: "default",
        flagKey: "test-flag",
        entityId: "",
        context: {},
      });
    });
  });

  describe("evaluateBoolean", () => {
    it("returns correct values for E2E environment when FLIPT_ENVIRONMENT is empty", async () => {
      process.env.FLIPT_ENVIRONMENT = "";

      // Maintenance mode should be disabled (app available)
      const maintenanceResult = await evaluateBoolean(
        mockRequest,
        "maintenance-mode-disabled"
      );
      expect(maintenanceResult).equal(true);

      // Signup should be enabled
      const signupResult = await evaluateBoolean(
        mockRequest,
        "signup-disabled"
      );
      expect(signupResult).equal(false);

      // Other flags should default to true
      const otherResult = await evaluateBoolean(mockRequest, "some-other-flag");
      expect(otherResult).equal(true);

      expect(mockBooleanFn).not.toHaveBeenCalled();
      expect(mockGetUserId).not.toHaveBeenCalled();
    });

    it("returns enabled value when flipt client returns response", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      mockBooleanFn.mockResolvedValue({ enabled: true });

      const result = await evaluateBoolean(mockRequest, "test-flag");

      expect(result).equal(true);
      expect(mockGetUserId).toHaveBeenCalledWith(mockRequest);
      expect(mockBooleanFn).toHaveBeenCalledWith({
        namespaceKey: "default",
        flagKey: "test-flag",
        entityId: "test-user-id",
        context: {},
      });
    });

    it("returns false when flag is disabled", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      mockBooleanFn.mockResolvedValue({ enabled: false });

      const result = await evaluateBoolean(mockRequest, "disabled-flag");

      expect(result).equal(false);
    });

    it("handles null user ID", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      mockGetUserId.mockResolvedValue(null);
      mockBooleanFn.mockResolvedValue({ enabled: true });

      await evaluateBoolean(mockRequest, "test-flag");

      expect(mockBooleanFn).toHaveBeenCalledWith({
        namespaceKey: "default",
        flagKey: "test-flag",
        entityId: "",
        context: {},
      });
    });

    it("returns default value when flipt client returns null", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      mockBooleanFn.mockResolvedValue(null);

      const result = await evaluateBoolean(mockRequest, FLAGS.SEARCH);

      expect(result).equal(DEFAULT_FLAG_VALUES[FLAGS.SEARCH]);
    });

    it("returns default value when flipt client returns undefined", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      mockBooleanFn.mockResolvedValue(undefined);

      const result = await evaluateBoolean(mockRequest, FLAGS.ARCHIVE);

      expect(result).equal(DEFAULT_FLAG_VALUES[FLAGS.ARCHIVE]);
    });

    it("returns default value when flipt client rejects with network error", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      mockBooleanFn.mockRejectedValue(new Error("Network error"));

      const result = await evaluateBoolean(mockRequest, FLAGS.UPCOMING_ROUTE);

      expect(result).equal(DEFAULT_FLAG_VALUES[FLAGS.UPCOMING_ROUTE]);
    });

    it("handles different environment values", async () => {
      process.env.FLIPT_ENVIRONMENT = "test-env";
      mockBooleanFn.mockResolvedValue({ enabled: true });

      const result = await evaluateBoolean(mockRequest, "env-flag");

      expect(result).equal(true);
      expect(mockBooleanFn).toHaveBeenCalledOnce();
    });

    it("returns false for SIGNUP_DISABLED flag on error", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      mockBooleanFn.mockRejectedValue(new Error("Network error"));

      const result = await evaluateBoolean(mockRequest, FLAGS.SIGNUP_DISABLED);

      expect(result).equal(false);
    });

    it("returns true for MAINTENANCE_MODE flag on error (inverted logic)", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      mockBooleanFn.mockRejectedValue(new Error("Network error"));

      const result = await evaluateBoolean(
        mockRequest,
        FLAGS.MAINTENANCE_MODE
      );

      expect(result).equal(true);
    });

    it("returns false for PLEX flag on error (optional feature)", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      mockBooleanFn.mockRejectedValue(new Error("Network error"));

      const result = await evaluateBoolean(mockRequest, FLAGS.PLEX);

      expect(result).equal(false);
    });

    it("returns false for unknown flag on error", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      mockBooleanFn.mockRejectedValue(new Error("Network error"));

      const result = await evaluateBoolean(mockRequest, "unknown-flag");

      expect(result).equal(false);
    });
  });

  describe("evaluateVariant error handling", () => {
    it("returns null when flipt client throws error", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      mockVariantFn.mockRejectedValue(new Error("Service unavailable"));

      const result = await evaluateVariant(mockRequest, "test-flag");

      expect(result).toBeNull();
    });

    it("returns null when flipt client network fails", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      mockVariantFn.mockRejectedValue(new Error("Connection timeout"));

      const result = await evaluateVariant(mockRequest, "test-flag");

      expect(result).toBeNull();
    });
  });

  describe("evaluateBooleanFromScripts", () => {
    it("returns enabled value when flipt client returns response", async () => {
      mockBooleanFn.mockResolvedValue({ enabled: true });

      const result = await evaluateBooleanFromScripts(FLAGS.FETCH_FROM_SOURCE);

      expect(result).equal(true);
      expect(mockBooleanFn).toHaveBeenCalledWith({
        namespaceKey: "default",
        flagKey: FLAGS.FETCH_FROM_SOURCE,
        entityId: "scripts",
        context: {},
      });
    });

    it("returns default value when flipt client throws error", async () => {
      mockBooleanFn.mockRejectedValue(new Error("Connection timeout"));

      const result = await evaluateBooleanFromScripts(FLAGS.FETCH_FROM_SOURCE);

      expect(result).equal(DEFAULT_FLAG_VALUES[FLAGS.FETCH_FROM_SOURCE]);
    });

    it("returns default value when flipt client returns null", async () => {
      mockBooleanFn.mockResolvedValue(null);

      const result = await evaluateBooleanFromScripts(FLAGS.FETCH_FROM_SOURCE);

      expect(result).equal(DEFAULT_FLAG_VALUES[FLAGS.FETCH_FROM_SOURCE]);
    });

    it("returns false for unknown flag on error", async () => {
      mockBooleanFn.mockRejectedValue(new Error("Network error"));

      const result = await evaluateBooleanFromScripts("unknown-flag");

      expect(result).equal(false);
    });
  });
});
