/**
 * Single source of truth for the version reported in output documents and in
 * the User-Agent. Read from package.json rather than duplicated, because the
 * hardcoded copy drifted (`0.1.0` in the feed while the package was `0.1.1`).
 *
 * `../package.json` resolves from both `src/` (tests) and `dist/` (build).
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

export const PACKAGE_VERSION: string = pkg.version;
