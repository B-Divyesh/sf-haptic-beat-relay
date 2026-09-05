import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolveExpectedSha } from './release-identity.mjs';

// @claim:singleton-deployment

const deployment = JSON.parse(readFileSync(new URL('../deploy/containerapp.json', import.meta.url), 'utf8'));
const resourceGroup = process.env.RELAY_RESOURCE_GROUP ?? deployment.resourceGroup;
const appName = process.env.RELAY_CONTAINER_APP ?? deployment.containerApp;
const baseURL = (process.env.RELAY_BASE_URL ?? 'https://haptic-beat-relay.sociobot.in').replace(/\/$/, '');
const expectedSha = resolveExpectedSha();

function az(args) {
  return execFileSync('az', args, { encoding: 'utf8' }).trim();
}

function azJson(args) {
  return JSON.parse(az([...args, '--output', 'json']));
}

const app = azJson(['containerapp', 'show', '--resource-group', resourceGroup, '--name', appName]);
assert.equal(app.properties.configuration.activeRevisionsMode, deployment.activeRevisionsMode);
assert.equal(app.properties.configuration.ingress.transport.toLowerCase(), deployment.ingress.transport);
assert.equal(app.properties.template.scale.minReplicas, deployment.scale.minReplicas);
assert.equal(app.properties.template.scale.maxReplicas, deployment.scale.maxReplicas);
const dataVolumes = app.properties.template.volumes?.filter((volume) =>
  volume.name === deployment.storage.volumeName
  && volume.storageName === deployment.storage.storageName
  && volume.storageType === deployment.storage.storageType
) ?? [];
assert.equal(dataVolumes.length, 1, 'the durable relay volume must be attached exactly once');
const dataMounts = app.properties.template.containers?.[0]?.volumeMounts?.filter((mount) =>
  mount.volumeName === deployment.storage.volumeName
  && mount.mountPath === deployment.dataDir
) ?? [];
assert.equal(dataMounts.length, 1, 'the durable relay volume must be mounted at /data exactly once');

const revisions = azJson(['containerapp', 'revision', 'list', '--resource-group', resourceGroup, '--name', appName]);
const active = revisions.filter((revision) => revision.properties.active);
assert.equal(active.length, 1, 'exactly one revision must be active');
assert.equal(active[0].properties.trafficWeight, 100, 'the active revision must receive all traffic');
assert.equal(active[0].properties.template.scale.minReplicas, deployment.scale.minReplicas);
assert.equal(active[0].properties.template.scale.maxReplicas, deployment.scale.maxReplicas);

const revisionName = active[0].name;
const containers = active[0].properties.template.containers;
const expectedImage = `${deployment.registry}.azurecr.io/${deployment.imageRepository}:${expectedSha}`;
const activeDataVolumes = active[0].properties.template.volumes?.filter((volume) =>
  volume.name === deployment.storage.volumeName
  && volume.storageName === deployment.storage.storageName
  && volume.storageType === deployment.storage.storageType
) ?? [];
assert.equal(activeDataVolumes.length, 1, 'the active revision must use the durable relay volume');
const activeDataMounts = containers?.[0]?.volumeMounts?.filter((mount) =>
  mount.volumeName === deployment.storage.volumeName
  && mount.mountPath === deployment.dataDir
) ?? [];
assert.equal(activeDataMounts.length, 1, 'the active revision must mount durable relay state at /data');

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
  dataDir: deployment.dataDir,
  dataVolume: dataVolumes[0].storageName,
  image: containers[0].image,
  buildSha: health.build_sha,
}));
