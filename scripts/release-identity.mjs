import { readFileSync } from 'node:fs';

const SHA_PATTERN = /^[0-9a-f]{40}$/;

export const releaseMetadataFile = new URL('../.factory/release.json', import.meta.url);

function validSha(value, source) {
  if (typeof value !== 'string' || !SHA_PATTERN.test(value)) {
    throw new Error(`${source} must be a 40-character lowercase Git SHA.`);
  }
  return value;
}

export function readReleaseMetadata(releaseFile = releaseMetadataFile) {
  const metadata = JSON.parse(readFileSync(releaseFile, 'utf8'));
  return {
    ...metadata,
    implementation_sha: validSha(metadata.implementation_sha, 'release metadata implementation_sha'),
    documentation_sha: validSha(metadata.documentation_sha, 'release metadata documentation_sha'),
  };
}

export function resolveExpectedSha({
  explicitSha = process.env.RELAY_EXPECTED_SHA,
  releaseFile = releaseMetadataFile,
} = {}) {
  if (explicitSha !== undefined) {
    return validSha(explicitSha, 'RELAY_EXPECTED_SHA');
  }
  return readReleaseMetadata(releaseFile).implementation_sha;
}
