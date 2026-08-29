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
assert.match(deployScript, /--min-replicas 1\s+\\?\n\s*--max-replicas 1/, 'deployment must apply the one-replica scale contract');
assert.match(deployScript, /containerapp revision set-mode[\s\S]*--mode single/, 'deployment must force single active-revision mode before each release');
assert.match(deployScript, /az containerapp ingress update[\s\S]*--transport http/, 'deployment must pin HTTP ingress for WebSocket upgrades');
assert.match(deployScript, /active_revisions=.*revision list/, 'deployment must verify there is exactly one active revision');
assert.match(deployScript, /actual_max=.*maxReplicas/, 'deployment must verify the applied maximum replica count');
assert.match(deployScript, /active_max=.*revision show/, 'deployment must verify the active revision itself has a one-replica maximum');
assert.match(deployScript, /running_replicas=.*replica list/, 'deployment must wait for exactly one running active replica');
assert.match(deployScript, /tr '\[:upper:\]' '\[:lower:\]'/, 'deployment must normalize Azure ingress transport casing before verification');

console.log('deployment contract ok: one active revision, min/max replicas 1, HTTP ingress');
