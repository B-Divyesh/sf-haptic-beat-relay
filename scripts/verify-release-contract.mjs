import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
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

console.log(`release contract ok: ${rustBuilder[1]}`);

const deployment = JSON.parse(readFileSync(new URL('../deploy/containerapp.json', import.meta.url), 'utf8'));
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
assert.equal(deployment.containerApp, 'sf-haptic-beat-relay');
assert.equal(deployment.activeRevisionsMode, 'Single');
assert.deepEqual(
  deployment.scale,
  { minReplicas: 1, maxReplicas: 1 },
  'the process-local ephemeral room store requires exactly one live replica',
);
assert.deepEqual(
  deployment.ingress,
  { transport: 'http' },
  'WebSocket upgrades require explicit HTTP ingress for the single-process relay',
);

const deployScript = readFileSync(new URL('./deploy-containerapp.sh', import.meta.url), 'utf8');
assert.equal(packageJson.scripts.deploy, 'sh scripts/deploy-containerapp.sh', 'the package deployment entry point must use the guarded rollout script');
assert.match(deployScript, /checked_out_revision=.*git rev-parse --verify HEAD/, 'deployment must resolve the checked-out source identity');
assert.match(deployScript, /\[ "\$revision" != "\$checked_out_revision" \]/, 'deployment must reject a caller-supplied identity that is not HEAD');
assert.match(deployScript, /--min-replicas 1\s+\\?\n\s*--max-replicas 1/, 'deployment must apply the one-replica scale contract');
assert.match(deployScript, /containerapp revision set-mode[\s\S]*--mode single/, 'deployment must force single active-revision mode before each release');
assert.match(deployScript, /az containerapp ingress update[\s\S]*--transport http/, 'deployment must pin HTTP ingress for WebSocket upgrades');
assert.match(deployScript, /active_revisions=.*revision list/, 'deployment must verify there is exactly one active revision');
assert.match(deployScript, /actual_max=.*maxReplicas/, 'deployment must verify the applied maximum replica count');
assert.match(deployScript, /active_max=.*revision show/, 'deployment must verify the active revision itself has a one-replica maximum');
assert.match(deployScript, /running_replicas=.*replica list/, 'deployment must wait for exactly one running active replica');
assert.match(deployScript, /tr '\[:upper:\]' '\[:lower:\]'/, 'deployment must normalize Azure ingress transport casing before verification');

const imageRollout = deployScript.indexOf('az containerapp update');
const ingressAfterRollout = deployScript.indexOf('az containerapp ingress update', imageRollout);
assert.ok(imageRollout >= 0, 'deployment must roll out the image');
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

console.log('deployment contract ok: one active revision, min/max replicas 1, HTTP ingress, relay, and repeated rate limits live-checked');

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
