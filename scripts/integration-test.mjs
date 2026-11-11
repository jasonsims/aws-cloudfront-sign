// Consumer-level integration tests: pack the package, install ONLY the
// tarball into an empty temp project, and run test/integration there with
// `node --test` (no devDependencies, so it runs on every Node in engines).
//
// Usage:
//   node scripts/integration-test.mjs [target ...]
//
// Targets (default: "."):
//   .                              build and pack the current working tree
//   <git ref>                      e.g. master, HEAD~3, v3.0.2 (built in a temp worktree)
//   path/to/package.tgz            an already packed tarball
//   npm:<spec>                     a published version, e.g. npm:aws-cloudfront-sign@3.0.2
//
// The suite is always taken from this checkout, so the same tests can be run
// against older builds to check for regressions.
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const suiteDir = join(repoRoot, 'test', 'integration');
const keyFile = join(repoRoot, 'test', 'files', 'dummy.pem');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(cmd, args, cwd) {
  console.log(`$ ${cmd} ${args.join(' ')}  (in ${cwd})`);
  execFileSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

function isGitRef(target) {
  try {
    execFileSync(
      'git',
      ['rev-parse', '--verify', '--quiet', `${target}^{commit}`],
      {
        cwd: repoRoot,
        stdio: 'ignore',
      },
    );
    return true;
  } catch {
    return false;
  }
}

// `--ignore-scripts` everywhere: lifecycle scripts (e.g. hook installers) must
// not touch the shared git config from a temp worktree.
function buildAndPack(dir, packDir) {
  run(npm, ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], dir);
  run(npm, ['run', 'build'], dir);
  run(npm, ['pack', '--ignore-scripts', '--pack-destination', packDir], dir);
}

function packTarget(target, workDir) {
  const packDir = join(workDir, 'pack');
  mkdirSync(packDir, { recursive: true });

  if (target.startsWith('npm:')) {
    run(npm, ['pack', target.slice(4), '--pack-destination', packDir], workDir);
  } else if (target.endsWith('.tgz')) {
    cpSync(resolve(target), join(packDir, 'package.tgz'));
  } else if (target === '.') {
    buildAndPack(repoRoot, packDir);
  } else if (isGitRef(target)) {
    const tree = join(workDir, 'tree');
    run('git', ['worktree', 'add', '--detach', tree, target], repoRoot);
    try {
      buildAndPack(tree, packDir);
    } finally {
      run('git', ['worktree', 'remove', '--force', tree], repoRoot);
    }
  } else {
    throw new Error(
      `Unknown target "${target}" (not ".", a git ref, a .tgz or npm:<spec>)`,
    );
  }

  const [tarball] = readdirSync(packDir).filter((f) => f.endsWith('.tgz'));
  if (!tarball) throw new Error(`No tarball produced for ${target}`);
  return join(packDir, tarball);
}

function testTarget(target) {
  const workDir = mkdtempSync(join(tmpdir(), 'aws-cloudfront-sign-it-'));
  try {
    const tarball = packTarget(target, workDir);

    const consumer = join(workDir, 'consumer');
    mkdirSync(consumer);
    writeFileSync(
      join(consumer, 'package.json'),
      JSON.stringify({ name: 'consumer', version: '0.0.0', private: true }),
    );
    run(
      npm,
      ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball],
      consumer,
    );

    // Copy the suite in so 'aws-cloudfront-sign' resolves to the installed
    // tarball, never back to this repository.
    cpSync(suiteDir, consumer, { recursive: true });
    cpSync(keyFile, join(consumer, 'dummy.pem'));

    const tests = readdirSync(consumer).filter((f) =>
      /\.test\.(c|m)?js$/.test(f),
    );
    run(process.execPath, ['--test', ...tests], consumer);
    return true;
  } catch (err) {
    console.error(`\n✖ ${target}: ${err.message}`);
    return false;
  } finally {
    if (existsSync(workDir)) rmSync(workDir, { recursive: true, force: true });
  }
}

const targets = process.argv.slice(2);
const results = (targets.length ? targets : ['.']).map((target) => {
  console.log(
    `\n=== Integration tests: ${target} (Node ${process.version}) ===`,
  );
  return [target, testTarget(target)];
});

console.log('\nSummary');
for (const [target, ok] of results)
  console.log(`  ${ok ? '✔' : '✖'} ${target}`);
process.exitCode = results.every(([, ok]) => ok) ? 0 : 1;
