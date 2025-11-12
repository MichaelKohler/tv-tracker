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
import { FLAGS, evaluateVariant, evaluateBoolean } from "./flags.server";

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

    it("throws error when flipt client returns null", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      mockBooleanFn.mockResolvedValue(null);

      await expect(evaluateBoolean(mockRequest, "test-flag")).rejects.toThrow(
        "Failed to evaluate boolean flag"
      );
    });

    it("throws error when flipt client returns undefined", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      mockBooleanFn.mockResolvedValue(undefined);

      await expect(evaluateBoolean(mockRequest, "test-flag")).rejects.toThrow(
        "Failed to evaluate boolean flag"
      );
    });

    it("handles flipt client rejection", async () => {
      process.env.FLIPT_ENVIRONMENT = "production";
      mockBooleanFn.mockRejectedValue(new Error("Network error"));

      await expect(evaluateBoolean(mockRequest, "test-flag")).rejects.toThrow(
        "Network error"
      );
    });

    it("handles different environment values", async () => {
      process.env.FLIPT_ENVIRONMENT = "test-env";
      mockBooleanFn.mockResolvedValue({ enabled: true });

      const result = await evaluateBoolean(mockRequest, "env-flag");

      expect(result).equal(true);
      expect(mockBooleanFn).toHaveBeenCalledOnce();
    });
  });
});
