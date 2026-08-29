import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname);
const deployScript = join(root, 'scripts', 'deploy-containerapp.sh');
const tempDirectory = mkdtempSync(join(tmpdir(), 'haptic-beat-relay-deploy-contract-'));
const fakeBin = join(tempDirectory, 'bin');
const commandLog = join(tempDirectory, 'commands.log');
const npmLog = join(tempDirectory, 'npm.log');
const revision = '0123456789abcdef0123456789abcdef01234567';

try {
  mkdirSync(fakeBin);
  const fakeAz = join(fakeBin, 'az');
  const fakeGit = join(fakeBin, 'git');
  const fakeNpm = join(fakeBin, 'npm');
  const fakeSleep = join(fakeBin, 'sleep');

  writeFileSync(fakeAz, `#!/usr/bin/env sh
set -eu
printf '%s\\n' "$*" >> "$RELAY_DEPLOY_COMMAND_LOG"
case "$*" in
  *"containerapp show"*"activeRevisionsMode"*) printf 'Single\\n' ;;
  *"containerapp show"*"scale.minReplicas"*) printf '1\\n' ;;
  *"containerapp show"*"scale.maxReplicas"*) printf '%s\\n' "\${RELAY_FAKE_MAX_REPLICAS:-1}" ;;
  *"containerapp show"*"ingress.transport"*) printf '%s\\n' "\${RELAY_FAKE_TRANSPORT:-Http}" ;;
  *"revision list"*"length([?properties.active])"*) printf '1\\n' ;;
  *"revision list"*"trafficWeight"*) printf 'sf-haptic-beat-relay--r0123456789\\n' ;;
  *"replica list"*) printf '%s\\n' "\${RELAY_FAKE_RUNNING_REPLICAS:-1}" ;;
  *"revision show"*"scale.minReplicas"*) printf '1\\n' ;;
  *"revision show"*"scale.maxReplicas"*) printf '%s\\n' "\${RELAY_FAKE_MAX_REPLICAS:-1}" ;;
esac
`, 'utf8');
  writeFileSync(fakeGit, `#!/usr/bin/env sh
set -eu
if [ "$*" = "rev-parse --verify HEAD" ]; then
  printf '%s\\n' "$RELAY_DEPLOY_EXPECTED_REVISION"
  exit 0
fi
exit 2
`, 'utf8');
  writeFileSync(fakeNpm, `#!/usr/bin/env sh
set -eu
printf '%s|%s|%s|%s\\n' "\${RELAY_EXPECTED_SHA:-}" "\${RELAY_ROUNDS:-}" "\${RELAY_RATE_REPETITIONS:-}" "$*" >> "$RELAY_DEPLOY_NPM_LOG"
`, 'utf8');
  writeFileSync(fakeSleep, '#!/usr/bin/env sh\nexit 0\n', 'utf8');
  chmodSync(fakeAz, 0o755);
  chmodSync(fakeGit, 0o755);
  chmodSync(fakeNpm, 0o755);
  chmodSync(fakeSleep, 0o755);

  const result = spawnSync('sh', [deployScript, revision], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${fakeBin}:${process.env.PATH}`,
      RELAY_DEPLOY_COMMAND_LOG: commandLog,
      RELAY_DEPLOY_NPM_LOG: npmLog,
      RELAY_DEPLOY_EXPECTED_REVISION: revision,
      RELAY_ROUNDS: '1',
    },
  });

  assert.equal(result.status, 0, `deployment contract harness failed:\n${result.stderr}`);

  const commands = readFileSync(commandLog, 'utf8').trim().split('\n');
  const find = (fragment) => commands.findIndex((command) => command.includes(fragment));
  const rollout = find(`containerapp update --resource-group sociobot --name sf-haptic-beat-relay --image sociobotregistry.azurecr.io/sf-haptic-beat-relay:${revision}`);
  const ingress = find('containerapp ingress update --resource-group sociobot --name sf-haptic-beat-relay --transport http');
  const singleRevisionMode = find('containerapp revision set-mode --resource-group sociobot --name sf-haptic-beat-relay --mode single');

  assert.ok(find(`acr build --registry sociobotregistry --image sf-haptic-beat-relay:${revision} --build-arg BUILD_SHA=${revision} .`) >= 0, 'the image build must receive the exact release identity');
  assert.ok(singleRevisionMode >= 0, 'the deployment must enforce single revision mode');
  assert.ok(rollout > singleRevisionMode, 'the image rollout must occur after single revision mode is set');
  assert.ok(ingress > rollout, 'HTTP ingress must be applied after the rollout because Azure can reset it to Auto');
  assert.ok(commands[rollout].includes('--min-replicas 1 --max-replicas 1'), 'the new revision must be pinned to exactly one replica');

  const firstTopologyRead = find("containerapp show --resource-group sociobot --name sf-haptic-beat-relay --query properties.configuration.activeRevisionsMode --output tsv");
  assert.ok(firstTopologyRead > ingress, 'the live topology must be read only after scale and ingress reconciliation');

  assert.deepEqual(
    readFileSync(npmLog, 'utf8').trim().split('\n'),
    [
      `${revision}|1||run test:live-topology`,
      `|1||run test:live-relay`,
      `|1|5|run test:live-rate-limit`,
    ],
    'a successful deployment must run the topology identity, repeated relay, and five-fresh-client rate-limit gates',
  );

  // Reproduce verification 14's exact release blocker in the deployment
  // harness: the controller rollout restored Auto ingress and a 1-3 replica
  // range, then three processes split room and rate-limit state. The
  // source-owned path must stop before any live success gate can run.
  const npmBeforeDrift = readFileSync(npmLog, 'utf8');
  const drift = spawnSync('sh', [deployScript, revision], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${fakeBin}:${process.env.PATH}`,
      RELAY_DEPLOY_COMMAND_LOG: commandLog,
      RELAY_DEPLOY_NPM_LOG: npmLog,
      RELAY_DEPLOY_EXPECTED_REVISION: revision,
      RELAY_FAKE_TRANSPORT: 'Auto',
      RELAY_FAKE_MAX_REPLICAS: '3',
      RELAY_FAKE_RUNNING_REPLICAS: '3',
    },
  });
  assert.equal(drift.status, 1, 'the verifier topology must block deployment');
  assert.match(
    drift.stderr,
    /min=1 max=3 transport=auto[\s\S]*active_min=1 active_max=3 running_replicas=3/,
    'the rejected deployment must report the exact ingress, scale, active-revision, and replica drift',
  );
  assert.equal(
    readFileSync(npmLog, 'utf8'),
    npmBeforeDrift,
    'a drifted topology must not run relay or allowance success gates',
  );

  const commandsBeforeMismatch = readFileSync(commandLog, 'utf8');
  const mismatch = spawnSync('sh', [deployScript, 'fedcba9876543210fedcba9876543210fedcba98'], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${fakeBin}:${process.env.PATH}`,
      RELAY_DEPLOY_COMMAND_LOG: commandLog,
      RELAY_DEPLOY_NPM_LOG: npmLog,
      RELAY_DEPLOY_EXPECTED_REVISION: revision,
    },
  });
  assert.equal(mismatch.status, 2, 'a release identity different from HEAD must be rejected before deployment');
  assert.match(mismatch.stderr, /does not match checked-out HEAD/, 'the rejected identity must explain the recovery');
  assert.equal(readFileSync(commandLog, 'utf8'), commandsBeforeMismatch, 'a mismatched identity must not call Azure');

console.log('deployment command regression passed: singleton scale, post-rollout HTTP ingress, and all live gates are enforced');
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}
