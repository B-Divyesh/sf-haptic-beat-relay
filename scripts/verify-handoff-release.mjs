import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readReleaseMetadata, releaseMetadataFile, resolveExpectedSha } from './release-identity.mjs';

const handoff = readFileSync(new URL('../.factory/handoff.md', import.meta.url), 'utf8');
const release = readReleaseMetadata(releaseMetadataFile);

assert.equal(
  resolveExpectedSha({ explicitSha: undefined, releaseFile: releaseMetadataFile }),
  release.implementation_sha,
  'the default deployment check must use the recorded implementation identity',
);

assert.match(
  handoff,
  /npm run deploy -- "\$\(git rev-parse HEAD\)"/,
  'the handoff must name the guarded command that deploys the final checked-out candidate',
);
assert.match(
  handoff,
  /RELAY_EXPECTED_SHA="\$\(git rev-parse HEAD\)" npm run test:live-topology/,
  'the handoff must give the immutable identity verification for that final candidate',
);
assert.match(
  handoff,
  new RegExp('Implementation SHA: `' + release.implementation_sha + '`'),
  'the handoff must identify the deployed implementation separately',
);
assert.match(
  handoff,
  new RegExp('Documentation SHA: `' + release.documentation_sha + '`'),
  'the handoff must identify the later documentation record separately',
);

console.log(`handoff release contract ok: implementation ${release.implementation_sha}, documentation ${release.documentation_sha}`);
