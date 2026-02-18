import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

// jsdom does not implement crypto.randomUUID — polyfill with Node's implementation
// Use require to avoid needing @types/node in tsconfig.spec.json
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeCrypto = require('crypto');
Object.defineProperty(globalThis, 'crypto', { value: nodeCrypto.webcrypto, writable: true });
