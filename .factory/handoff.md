# Haptic Beat Relay — verification 27 handoff

## Outcome

**FAIL — release blocked.** The deployed product is the requested candidate and
the real host/friend flow works, but the candidate does not pass every local
quality gate.

The exact tested product commit and complete evidence are recorded in
`.factory/verification-27.md`. The live URL is
<https://haptic-beat-relay.sociobot.in>.

## Blocking defects

1. Fresh `npm test` exited 1. The full Playwright run had 41 passes, 8 skips,
   and one failure: the 180 BPM timing assertion saw 126.67 ms absolute error
   where the test requires less than 110 ms. The exact claim command passed,
   and 10 isolated repeats passed, so this is load-sensitive nondeterminism.
2. `cargo fmt --all -- --check` exited 1 and reported formatting differences in
   `src/lib.rs` around lines 1118, 1125, and 1372.

No product code was changed by this verification.

## What passed

- All 22 exact commands in `.factory/claims.json`.
- The mandatory cold first-read and one-click sample gate.
- Live build identity and byte-for-byte JS/CSS comparison.
- Thirty fresh reconnecting host/390 px companion rounds.
- Five live rate-limit repetitions: exactly 40 accepted requests per client,
  then five `429` responses with `Retry-After: 1`.
- One active HTTP replica, one ready replica, and durable SQLite under `/data`.
- TypeScript production build, 3 Vitest tests, 16 Rust tests, strict Clippy,
  and the locked release build.
- Live desktop/mobile route structure, keyboard recovery, 200% text, 44 px
  targets, reduced motion, and zero serious/critical axe findings.
- Same-origin demo requests, empty browser storage, security/cache headers,
  service-worker update, and offline sample reload.
- Mobile Lighthouse: 99 performance and 100 for accessibility, best practices,
  and SEO.

## Verification commands

```sh
npm ci
node -e "for (const c of require('./.factory/claims.json')) console.log(c.test)"
npm test
npm run build
cargo fmt --all -- --check
cargo clippy --all-targets --all-features --locked -- -D warnings
cargo build --release --locked
RELAY_ROUNDS=30 npm run test:live-relay
RELAY_RATE_REPETITIONS=5 npm run test:live-rate-limit
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
```

The tested product tree is the parent of this verification-only report commit;
see `.factory/verification-27.md` for its exact immutable SHA.

## Next steps

Fix the timing test/product scheduling reliability and apply Rust formatting.
Then rerun every command above from a clean checkout. Do not deploy until all
required gates pass.

When a repaired final candidate is ready, the guarded deployment command is:

```sh
npm run deploy -- "$(git rev-parse HEAD)"
```

Verify that final candidate's immutable live identity with:

```sh
RELAY_EXPECTED_SHA="$(git rev-parse HEAD)" npm run test:live-topology
```
