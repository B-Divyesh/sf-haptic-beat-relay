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

const deployScript = readFileSync(new URL('./deploy-containerapp.sh', import.meta.url), 'utf8');
assert.match(deployScript, /--min-replicas 1\s+\\?\n\s*--max-replicas 1/, 'deployment must apply the one-replica scale contract');

console.log('deployment contract ok: active revisions Single; min/max replicas 1');
