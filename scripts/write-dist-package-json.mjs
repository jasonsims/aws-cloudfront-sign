// Marks each build output directory with its module format so Node (and
// type resolvers) treat dist/esm as ESM and dist/cjs as CommonJS,
// independent of the root package.json "type" field.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const formats = { esm: 'module', cjs: 'commonjs' };

for (const [dir, type] of Object.entries(formats)) {
  const outDir = join('dist', dir);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, 'package.json'),
    JSON.stringify({ type }, null, 2) + '\n',
  );
}
