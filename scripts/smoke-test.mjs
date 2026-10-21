// Smoke test for the packed npm tarball, as a consumer would install it.
//
// Usage:
//   npm run build && npm pack
//   node scripts/smoke-test.mjs ./aws-cloudfront-sign-<version>.tgz
//
// Creates an empty temp project, installs ONLY the tarball (no devDependencies),
// then checks that both `require('aws-cloudfront-sign')` and
// `import { getSignedUrl } from 'aws-cloudfront-sign'` load and produce a
// verifiable signed URL. Needs nothing but Node itself, so it runs on every
// Node version in package.json#engines (>=18).
//
// Internally, the script copies itself into the temp project and re-runs with
// `--check`, so the bare specifier resolves to the installed tarball rather
// than to this repository (package self-reference).
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = 'aws-cloudfront-sign';

async function check() {
  const { checkSignedUrl } = createRequire(import.meta.url)('./smoke-test.cjs');
  const mod = await import(PKG);
  const { getSignedUrl } = mod;
  checkSignedUrl('import { getSignedUrl }', getSignedUrl);
  checkSignedUrl('import default', mod.default.getSignedUrl);
}

function run(cmd, args, cwd) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

function main() {
  const tarballArg = process.argv[2];
  if (!tarballArg) {
    console.error('Usage: node scripts/smoke-test.mjs <path-to-package.tgz>');
    process.exit(2);
  }
  const tarball = resolve(tarballArg);
  if (!existsSync(tarball)) {
    console.error(`Tarball not found: ${tarball}`);
    process.exit(2);
  }

  console.log(`Node ${process.version}, tarball ${tarball}`);
  const here = dirname(fileURLToPath(import.meta.url));
  const project = mkdtempSync(join(tmpdir(), `${PKG}-smoke-`));
  try {
    writeFileSync(
      join(project, 'package.json'),
      JSON.stringify(
        { name: 'smoke-consumer', version: '0.0.0', private: true },
        null,
        2,
      ) + '\n',
    );
    run(
      'npm',
      ['install', '--no-audit', '--no-fund', '--ignore-scripts', tarball],
      project,
    );
    copyFileSync(join(here, 'smoke-test.mjs'), join(project, 'smoke-test.mjs'));
    copyFileSync(join(here, 'smoke-test.cjs'), join(project, 'smoke-test.cjs'));

    run(process.execPath, ['smoke-test.cjs'], project);
    run(process.execPath, ['smoke-test.mjs', '--check'], project);
    console.log('Smoke test passed.');
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
}

if (process.argv[2] === '--check') {
  await check();
} else {
  main();
}
