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
