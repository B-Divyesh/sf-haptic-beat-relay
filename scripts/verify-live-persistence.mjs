import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const deployment = JSON.parse(readFileSync(new URL('../deploy/containerapp.json', import.meta.url), 'utf8'));
const resourceGroup = process.env.RELAY_RESOURCE_GROUP ?? deployment.resourceGroup;
const appName = process.env.RELAY_CONTAINER_APP ?? deployment.containerApp;
const baseURL = (process.env.RELAY_BASE_URL ?? 'https://haptic-beat-relay.sociobot.in').replace(/\/$/, '');
const expectedSha = process.env.RELAY_EXPECTED_SHA
  ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const client = '198.51.100.230';

function azJson(args) {
  return JSON.parse(execFileSync('az', [...args, '--output', 'json'], { encoding: 'utf8' }));
}

function activeRevision() {
  const revisions = azJson(['containerapp', 'revision', 'list', '--resource-group', resourceGroup, '--name', appName]);
  const active = revisions.filter((revision) => revision.properties.active);
  assert.equal(active.length, 1, 'persistence proof requires exactly one active revision');
  return active[0].name;
}

function readyReplica(revision) {
  return azJson([
    'containerapp', 'replica', 'list', '--resource-group', resourceGroup, '--name', appName, '--revision', revision,
  ]).find((replica) =>
    replica.properties.runningState === 'Running'
    && replica.properties.containers?.length === 1
    && replica.properties.containers[0].ready === true
  );
}

const createdResponse = await fetch(`${baseURL}/api/rooms`, {
  method: 'POST',
  cache: 'no-store',
  headers: { 'X-Forwarded-For': client },
});
assert.equal(createdResponse.status, 200, `durability setup failed: ${await createdResponse.text()}`);
const room = await createdResponse.json();
assert.match(room.code, /^[A-Z0-9]{6}$/);

const revision = activeRevision();
const before = readyReplica(revision);
assert.ok(before, 'the active revision must have a ready replica before restart');

execFileSync('az', [
  'containerapp', 'revision', 'restart',
  '--resource-group', resourceGroup,
  '--name', appName,
  '--revision', revision,
], { stdio: 'inherit' });

let after;
for (let attempt = 0; attempt < 36; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 5_000));
  after = readyReplica(revision);
  if (after && after.name !== before.name) {
    const healthResponse = await fetch(`${baseURL}/health`, { cache: 'no-store' }).catch(() => null);
    if (healthResponse?.status === 200) {
      const health = await healthResponse.json();
      if (health.build_sha === expectedSha) break;
    }
  }
  after = undefined;
}
assert.ok(after, 'the restarted full-SHA revision did not return with a new ready replica');

const joinResponse = await fetch(`${baseURL}/api/rooms/${room.code}/join`, {
  method: 'POST',
  cache: 'no-store',
  headers: { 'X-Forwarded-For': client },
});
const joinBody = await joinResponse.text();
assert.equal(joinResponse.status, 200, `room ${room.code} was not restored from durable SQLite: ${joinBody}`);
assert.match(JSON.parse(joinBody).companion_token, /^[A-Z0-9]{32}$/);

console.log(JSON.stringify({
  revision,
  replicaBefore: before.name,
  replicaAfter: after.name,
  room: room.code,
  persistedAcrossRestart: true,
  buildSha: expectedSha,
}));
