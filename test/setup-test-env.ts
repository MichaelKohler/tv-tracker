import { expect, afterEach } from 'vitest';
import { installGlobals } from "@remix-run/node";
import matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

installGlobals();

// extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});
