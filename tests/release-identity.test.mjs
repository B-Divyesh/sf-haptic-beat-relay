import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { resolveExpectedSha } from '../scripts/release-identity.mjs';

const implementationSha = '1964c68a15d95639acddeaf011e778d479bc4895';
const documentationSha = 'f1441e4893d4c6f30bbf4d18262594c5b3fd7023';
const nextCandidateSha = '0123456789abcdef0123456789abcdef01234567';

function releaseFile(metadata) {
  const directory = mkdtempSync(join(tmpdir(), 'haptic-beat-relay-release-'));
  const file = join(directory, 'release.json');
  writeFileSync(file, JSON.stringify(metadata));
  return { directory, file };
}

test('uses the recorded implementation SHA for a later documentation checkout', () => {
  const fixture = releaseFile({
    implementation_sha: implementationSha,
    documentation_sha: documentationSha,
    live_url: 'https://haptic-beat-relay.sociobot.in',
  });
  try {
    assert.equal(resolveExpectedSha({ explicitSha: undefined, releaseFile: fixture.file }), implementationSha);
    assert.notEqual(resolveExpectedSha({ explicitSha: undefined, releaseFile: fixture.file }), documentationSha);
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test('uses an explicit candidate SHA for a guarded deployment check', () => {
  const fixture = releaseFile({
    implementation_sha: implementationSha,
    documentation_sha: documentationSha,
  });
  try {
    assert.equal(resolveExpectedSha({ explicitSha: nextCandidateSha, releaseFile: fixture.file }), nextCandidateSha);
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test('rejects malformed release identities instead of silently using a checkout SHA', () => {
  const fixture = releaseFile({ implementation_sha: 'not-a-sha', documentation_sha: documentationSha });
  try {
    assert.throws(
      () => resolveExpectedSha({ explicitSha: undefined, releaseFile: fixture.file }),
      /release metadata implementation_sha must be a 40-character lowercase Git SHA/,
    );
    assert.throws(
      () => resolveExpectedSha({ explicitSha: 'HEAD', releaseFile: fixture.file }),
      /RELAY_EXPECTED_SHA must be a 40-character lowercase Git SHA/,
    );
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
});
