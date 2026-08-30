import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Verification 21 was caused by recording release evidence for an earlier
// implementation commit, then pushing a later documentation candidate that
// the generic container path deployed. The guarded command already refuses a
// handoff that predates HEAD; this companion check keeps the handoff itself
// from presenting a previous 40-character commit as the release candidate.
const handoff = readFileSync(new URL('../.factory/handoff.md', import.meta.url), 'utf8');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const citedCommitIds = handoff.match(/\b[0-9a-f]{40}\b/g) ?? [];

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
assert.ok(
  citedCommitIds.every((commit) => commit === head),
  `the final handoff must not present an earlier commit as released; found ${citedCommitIds.join(', ') || 'none'}, HEAD is ${head}`,
);

console.log(`handoff release contract ok: ${citedCommitIds.length} static commit id(s), all match HEAD`);
