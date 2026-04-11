export {};

declare module "vitest" {
  interface JestAssertion<T = any> {
    toMatchScreenshot(
      name?: string,
      options?: {
        comparatorName?: string;
        comparatorOptions?: Record<string, unknown>;
        timeout?: number;
      }
    ): Promise<void>;
    toMatchScreenshot(options?: {
      comparatorName?: string;
      comparatorOptions?: Record<string, unknown>;
      timeout?: number;
    }): Promise<void>;
  }
}

declare module "@voidzero-dev/vite-plus-test" {
  interface JestAssertion<T = any> {
    toMatchScreenshot(
      name?: string,
      options?: {
        comparatorName?: string;
        comparatorOptions?: Record<string, unknown>;
        timeout?: number;
      }
    ): Promise<void>;
    toMatchScreenshot(options?: {
      comparatorName?: string;
      comparatorOptions?: Record<string, unknown>;
      timeout?: number;
    }): Promise<void>;
  }
}

declare module "vitest/node" {
  interface ToMatchScreenshotComparators {
    pixelmatch: {
      threshold?: number;
      allowedMismatchedPixelRatio?: number;
      allowedMismatchedPixels?: number;
    };
  }
}
