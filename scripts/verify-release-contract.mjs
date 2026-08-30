import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
const backendSource = readFileSync(new URL('../src/lib.rs', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../migrations/0001_shared_state.sql', import.meta.url), 'utf8');
const rustBuilder = dockerfile.match(/^FROM\s+(rust:[^\s]+)\s+AS\s+backend-builder$/m);

assert.ok(rustBuilder, 'Dockerfile must define a named backend-builder Rust stage');
assert.match(
  rustBuilder[1],
  /^rust:1-(?:slim|alpine)$/,
  'backend-builder must use the approved unpinned rust:1-slim or rust:1-alpine base',
);
assert.doesNotMatch(
  rustBuilder[1],
  /^rust:\d+\.\d+/,
  'backend-builder must not pin a Rust minor version',
);
assert.match(dockerfile, /mkdir -p \/data/, 'the image must provide a writable durable-data mount point');
assert.match(backendSource, /FilePath::new\("\/data"\)/, 'the runtime must default shared state to /data');
assert.match(backendSource, /SqlitePoolOptions/, 'room and rate-limit state must use SQLite');
assert.match(migration, /CREATE TABLE IF NOT EXISTS rooms/, 'the SQLite migration must create durable rooms');
assert.match(migration, /CREATE TABLE IF NOT EXISTS rate_limits/, 'the SQLite migration must create shared rate buckets');

console.log(`release contract ok: ${rustBuilder[1]}`);

const deployment = JSON.parse(readFileSync(new URL('../deploy/containerapp.json', import.meta.url), 'utf8'));
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(deployment.containerApp, 'sf-haptic-beat-relay');
assert.equal(deployment.activeRevisionsMode, 'Single');
assert.deepEqual(
  deployment.scale,
  { minReplicas: 1, maxReplicas: 1 },
  'the process-local WebSocket broadcaster requires exactly one live replica',
);
assert.deepEqual(
  deployment.ingress,
  { transport: 'http' },
  'WebSocket upgrades require explicit HTTP ingress for the single-process relay',
);
assert.deepEqual(
  { dataDir: deployment.dataDir, storage: deployment.storage },
  {
    dataDir: '/data',
    storage: {
      volumeName: 'sf-haptic-beat-relay-data',
      storageName: 'sf-haptic-beat-relay-data',
      storageType: 'AzureFile',
      mountPath: '/data',
    },
  },
  'the deployment contract must mount the work-order data volume at /data',
);
assert.deepEqual(
  deployment.stateTopology,
  {
    roomState: 'temporary records in durable SQLite under /data',
    webSocketBroadcast: 'process-local broadcast protected by singleton deployment',
    rateLimitBuckets: 'shared SQLite counters under /data',
    persistence: 'rooms survive restarts and expire after two hours',
  },
  'the deployment contract must document its durable and singleton state boundaries',
);

const deployScript = readFileSync(new URL('./deploy-containerapp.sh', import.meta.url), 'utf8');
assert.equal(packageJson.scripts.deploy, 'sh scripts/deploy-containerapp.sh', 'the package deployment entry point must use the guarded rollout script');
assert.match(deployScript, /config_file="deploy\/containerapp\.json"/, 'the guarded release must consume the checked-in deployment configuration');
assert.match(deployScript, /config\.activeRevisionsMode/, 'the release configuration must supply the active revision mode');
assert.match(deployScript, /config\.ingress && config\.ingress\.transport/, 'the release configuration must supply ingress transport');
assert.match(deployScript, /config\.scale && config\.scale\.minReplicas/, 'the release configuration must supply the replica floor');
assert.match(deployScript, /config\.scale && config\.scale\.maxReplicas/, 'the release configuration must supply the replica ceiling');
assert.doesNotMatch(deployScript, /--name sf-haptic-beat-relay/, 'the guarded release must not drift from its checked-in app configuration');
assert.match(deployScript, /checked_out_revision=.*git rev-parse --verify HEAD/, 'deployment must resolve the checked-out source identity');
assert.match(deployScript, /\[ "\$revision" != "\$checked_out_revision" \]/, 'deployment must reject a caller-supplied identity that is not HEAD');
assert.match(deployScript, /git status --porcelain --untracked-files=all/, 'deployment must reject a dirty release tree');
assert.match(deployScript, /git rev-parse --verify '@\{upstream\}'/, 'deployment must resolve the pushed release identity');
assert.match(deployScript, /\[ "\$upstream_revision" != "\$checked_out_revision" \]/, 'deployment must reject an unpushed release');
assert.match(deployScript, /git log -1 --format=%H -- \.factory\/handoff\.md/, 'deployment must require the final handoff in the released commit');
assert.match(deployScript, /\[ "\$handoff_revision" != "\$checked_out_revision" \]/, 'deployment must reject a candidate whose handoff predates HEAD');
assert.match(deployScript, /template\.scale = \{[\s\S]*minReplicas: Number\(min\), maxReplicas: Number\(max\)/, 'deployment must render the configured one-replica scale contract');
assert.match(deployScript, /container\.volumeMounts\.push\(\{ volumeName, mountPath \}\)/, 'deployment must render the durable /data mount');
assert.match(deployScript, /template\.volumes\.push\(\{ name: volumeName, storageName, storageType \}\)/, 'deployment must render the Azure Files volume');
assert.match(deployScript, /containerapp revision set-mode[\s\S]*--mode single/, 'deployment must force single active-revision mode before each release');
assert.match(deployScript, /az containerapp ingress update[\s\S]*--transport "\$ingress_transport"/, 'deployment must pin configured HTTP ingress for WebSocket upgrades');
assert.match(deployScript, /active_revisions=.*revision list/, 'deployment must verify there is exactly one active revision');
assert.match(deployScript, /actual_max=.*maxReplicas/, 'deployment must verify the applied maximum replica count');
assert.match(deployScript, /active_max=.*revision show/, 'deployment must verify the active revision itself has a one-replica maximum');
assert.match(deployScript, /active_volume=.*revision show/, 'deployment must verify the active revision uses the durable volume');
assert.match(deployScript, /active_mount=.*revision show/, 'deployment must verify the active revision mounts the database at /data');
assert.match(deployScript, /running_replicas=.*replica list/, 'deployment must wait for exactly one running active replica');
assert.match(deployScript, /ready_replicas=.*properties\.containers\[0\]\.ready/, 'deployment must wait for exactly one ready active application container');
assert.match(deployScript, /tr '\[:upper:\]' '\[:lower:\]'/, 'deployment must normalize Azure ingress transport casing before verification');

const imageRollout = deployScript.indexOf('az containerapp update');
const ingressAfterRollout = deployScript.indexOf('az containerapp ingress update', imageRollout);
assert.ok(imageRollout >= 0, 'deployment must roll out the image');
assert.match(
  deployScript,
  /container\.image = image;[\s\S]*template\.revisionSuffix = suffix;/,
  'the guarded rollout must use the configured full immutable SHA tag and an SHA-derived revision suffix',
);
assert.ok(
  ingressAfterRollout > imageRollout,
  'deployment must apply HTTP ingress after the image rollout so a revision update cannot restore Azure\'s Auto transport default',
);
assert.match(
  deployScript,
  /RELAY_EXPECTED_SHA="\$revision" npm run test:live-topology/,
  'deployment must verify the live topology and deployed build identity after rollout',
);
assert.match(
  deployScript,
  /RELAY_ROUNDS="\$\{RELAY_ROUNDS:-30\}" npm run test:live-relay/,
  'deployment must run repeated fresh-room HTTP and WebSocket checks after rollout',
);
assert.match(
  deployScript,
  /RELAY_RATE_REPETITIONS="\$\{RELAY_RATE_REPETITIONS:-5\}" npm run test:live-rate-limit/,
  'deployment must run five fresh-client rate-limit bursts after rollout',
);
assert.match(
  deployScript,
  /stability_seconds="\$\{RELAY_DEPLOY_STABILITY_SECONDS:-60\}"/,
  'deployment must leave a reconciliation window before its final success gate',
);
assert.equal(
  deployScript.split('RELAY_EXPECTED_SHA="$revision" npm run test:live-topology').length - 1,
  2,
  'deployment must verify topology and immutable identity both before and after all live functional gates',
);

const topologyChecker = readFileSync(new URL('./verify-live-topology.mjs', import.meta.url), 'utf8');
assert.match(
  topologyChecker,
  /expectedImage = `\$\{deployment\.registry\}\.azurecr\.io\/\$\{deployment\.imageRepository\}:\$\{expectedSha\}`/,
  'the singleton live claim must reject a generic configured-image rollout even when its health SHA matches',
);
assert.match(
  topologyChecker,
  /new RegExp\(`--r\$\{expectedSha\.slice\(0, 10\)\}\$`\)/,
  'the singleton live claim must require the guarded SHA-derived revision suffix',
);

console.log('deployment contract ok: final pushed identity, guarded image provenance, one active revision/replica, HTTP ingress, relay, and repeated rate limits live-checked');

const claims = JSON.parse(readFileSync(new URL('../.factory/claims.json', import.meta.url), 'utf8'));
const claimSources = [
  readFileSync(new URL('../tests/browser/product.spec.ts', import.meta.url), 'utf8'),
  readFileSync(new URL('../src/lib.rs', import.meta.url), 'utf8'),
  readFileSync(new URL('./verify-live-relay.mjs', import.meta.url), 'utf8'),
  readFileSync(new URL('./verify-live-rate-limit.mjs', import.meta.url), 'utf8'),
  readFileSync(new URL('./verify-live-topology.mjs', import.meta.url), 'utf8'),
].join('\n');
for (const claim of claims) {
  const tag = `@claim:${claim.id}`;
  assert.equal(
    claimSources.split(tag).length - 1,
    1,
    `${claim.id} must appear in exactly one browser or Rust regression test`,
  );
}
console.log(`claims contract ok: ${claims.length} listed claims each map to exactly one regression test`);
