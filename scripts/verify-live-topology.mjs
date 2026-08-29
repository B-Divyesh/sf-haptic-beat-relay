import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// @claim:singleton-deployment

const resourceGroup = process.env.RELAY_RESOURCE_GROUP ?? 'sociobot';
const appName = process.env.RELAY_CONTAINER_APP ?? 'sf-haptic-beat-relay';
const baseURL = (process.env.RELAY_BASE_URL ?? 'https://haptic-beat-relay.sociobot.in').replace(/\/$/, '');
const expectedSha = process.env.RELAY_EXPECTED_SHA
  ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

function az(args) {
  return execFileSync('az', args, { encoding: 'utf8' }).trim();
}

function azJson(args) {
  return JSON.parse(az([...args, '--output', 'json']));
}

const app = azJson(['containerapp', 'show', '--resource-group', resourceGroup, '--name', appName]);
assert.equal(app.properties.configuration.activeRevisionsMode.toLowerCase(), 'single');
assert.equal(app.properties.configuration.ingress.transport.toLowerCase(), 'http');
assert.equal(app.properties.template.scale.minReplicas, 1);
assert.equal(app.properties.template.scale.maxReplicas, 1);

const revisions = azJson(['containerapp', 'revision', 'list', '--resource-group', resourceGroup, '--name', appName]);
const active = revisions.filter((revision) => revision.properties.active);
assert.equal(active.length, 1, 'exactly one revision must be active');
assert.equal(active[0].properties.trafficWeight, 100, 'the active revision must receive all traffic');
assert.equal(active[0].properties.template.scale.minReplicas, 1);
assert.equal(active[0].properties.template.scale.maxReplicas, 1);

const revisionName = active[0].name;
const containers = active[0].properties.template.containers;
const expectedImage = `sociobotregistry.azurecr.io/sf-haptic-beat-relay:${expectedSha}`;

// A matching /health response alone is not enough. The previous failed
// release was rebuilt by the factory's generic container path: it baked the
// right SHA into the binary but silently restored Auto ingress and a 1–3
// replica scale range. The guarded deployment uses the full immutable ACR tag
// and an SHA-derived revision suffix, so assert both pieces of provenance
// before accepting its topology.
assert.equal(containers.length, 1, 'the active revision must have exactly one application container');
assert.equal(
  containers[0].image,
  expectedImage,
  'the active revision must use the guarded rollout’s full immutable image tag',
);
assert.match(
  revisionName,
  new RegExp(`--r${expectedSha.slice(0, 10)}$`),
  'the active revision must use the guarded rollout’s SHA-derived suffix',
);

const replicas = azJson(['containerapp', 'replica', 'list', '--resource-group', resourceGroup, '--name', appName, '--revision', revisionName]);
const running = replicas.filter((replica) => replica.properties.runningState === 'Running');
assert.equal(running.length, 1, 'exactly one replica must be running');
const ready = running.filter((replica) => replica.properties.containers?.length === 1 && replica.properties.containers[0].ready === true);
assert.equal(ready.length, 1, 'the one running replica must report its application container ready');

const healthResponse = await fetch(`${baseURL}/health`, { cache: 'no-store' });
assert.equal(healthResponse.status, 200);
const health = await healthResponse.json();
assert.deepEqual(health, { build_sha: expectedSha, status: 'ok' });

console.log(JSON.stringify({
  app: appName,
  revision: revisionName,
  activeRevisions: active.length,
  minReplicas: app.properties.template.scale.minReplicas,
  maxReplicas: app.properties.template.scale.maxReplicas,
  runningReplicas: running.length,
  readyReplicas: ready.length,
  transport: app.properties.configuration.ingress.transport,
  image: containers[0].image,
  buildSha: health.build_sha,
}));
