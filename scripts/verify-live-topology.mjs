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
const replicas = azJson(['containerapp', 'replica', 'list', '--resource-group', resourceGroup, '--name', appName, '--revision', revisionName]);
const running = replicas.filter((replica) => replica.properties.runningState === 'Running');
assert.equal(running.length, 1, 'exactly one replica must be running');

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
  transport: app.properties.configuration.ingress.transport,
  buildSha: health.build_sha,
}));
