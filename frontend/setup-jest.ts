import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv();

// jsdom does not implement crypto.randomUUID — polyfill with Node's implementation
// Use require to avoid needing @types/node in tsconfig.spec.json
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeCrypto = require('crypto');
Object.defineProperty(globalThis, 'crypto', { value: nodeCrypto.webcrypto, writable: true });

// jsdom does not implement window.matchMedia — stub it globally
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
