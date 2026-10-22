// ESM entry point (the "import" condition in package.json#exports).
//
// Up to 3.0.x only the CommonJS build was reachable, so Node's ESM/CJS interop
// let consumers write `import cf from 'aws-cloudfront-sign'`. A default export
// mirroring the named exports is kept here so that style keeps working now that
// ESM consumers load the native ESM build. The CommonJS entry is unchanged.
import * as api from './index.js';

export * from './index.js';
export default api;
