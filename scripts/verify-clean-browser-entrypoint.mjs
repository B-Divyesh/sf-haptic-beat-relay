import { existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('..', import.meta.url));
const dist = fileURLToPath(new URL('../frontend/dist', import.meta.url));
const builtShell = fileURLToPath(new URL('../frontend/dist/index.html', import.meta.url));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// Recreate the verifier's clean-checkout state: dependencies exist, dist does not.
rmSync(dist, { recursive: true, force: true });

const result = spawnSync(
  npm,
  ['run', 'test:browser', '--', '--grep', '@claim:connection-required'],
  {
    cwd: repository,
    env: { ...process.env, CI: '1' },
    stdio: 'inherit',
  },
);

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

if (!existsSync(builtShell)) {
  throw new Error('The browser-test entry point passed without rebuilding frontend/dist/index.html.');
}
