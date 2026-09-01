# Polish 2 — review finding closure

This repair covers every finding in `review-2.md` and each earlier finding
referenced there. Evidence paths are relative to `.factory/`.

| Finding | Change made | Evidence |
|---|---|---|
| F-2-1 / F-1-1 | Release the final immutable candidate through the guarded singleton deployment. | `npm run test:live-topology`; live `/health` |
| F-2-2 / F-1-17 | Rewrote the README deployment section as instructions with no deployment-behaviour promise. | `copy-audit.md`; README review |
| F-2-3 / F-1-22 | Removed reconnect failure-test jargon from public README. | `copy-audit.md`; README review |
| F-2-4 / F-1-23 | Removed unexplained hosting terms from public README. | `copy-audit.md`; README review |
| F-2-5 / F-1-40 | Removed the unlisted compound deployment claim from public README. | `copy-audit.md`; `npm run test:deployment-contract` |
| F-2-6 / F-1-32 | Replaced the audible-output status with “No audio loop selected.” | `npm run test:browser -- --grep @claim:local-audio` |
| F-2-7 / F-1-33 | Narrowed privacy copy to the separately proved account and third-party-request claims. | `npm run test:browser -- --grep @claim:no-account`; `@claim:no-third-party` |
| F-2-8 | Rewrote the audience sentence with phone vibration and a timing score. | `evidence/polish-2/landing-mobile.png`; first-viewport regression |
| F-2-9 | Removed the unlisted rollout implementation note from README. | `copy-audit.md`; README review |
| F-2-10 | Removed the unlisted test-runtime statement from README. | `copy-audit.md`; README review |
| F-2-11 | Removed protocol vocabulary from public README. | `copy-audit.md`; README review |
| F-2-12 | Removed hosting implementation language from public README. | `copy-audit.md`; README review |
| F-2-13 | Kept Demo, Join, and Privacy visible in the 390 px header. | `evidence/polish-2/mobile-routes.png`; browser mobile route test |
| F-2-14 | Replaced the unproved data-inventory sentence with the tested two-hour expiry. | `cargo test claim_ephemeral_rooms_persist_across_restart_until_the_configured_ttl` |
| F-2-15 | Replaced “private room” with “room.” | host browser route test |
| F-2-16 | Added a copy-room-link claim that opens the copied URL and checks the blocked-copy fallback. | `npm run test:browser -- --grep @claim:copy-room-link` |
| F-2-17 | Rewrote the sample text and added a measured 104 BPM sample-tempo claim. | `npm run test:browser -- --grep @claim:sample-tempo` |
| F-2-18 | Replaced the unproved stored-data inventory with narrow expiry and local-audio statements. | `@claim:ephemeral-rooms`; `@claim:local-audio` |
| F-2-19 | Removed the unproved network-address retention statement. | privacy route review; `copy-audit.md` |
| F-2-20 | Added and tested configured, `/data`, and executable-directory SQLite path selection. | `cargo test claim_database_path_uses_an_explicit_path_then_data_or_the_executable_directory` |
| F-2-21 | Rewrote the environment variable note as an exact tested path-selection statement. | `@claim:database-path`; `copy-audit.md` |
| F-2-22 | Removed the unproved rate-limit storage statement from README. | `copy-audit.md`; README review |
| F-2-23 | Removed the generic-rollout causal warning from public README. | `copy-audit.md`; README review |
| F-2-24 | Added a Space-key claim that completes a joined-room returned tap. | `npm run test:browser -- --grep @claim:space-key-tap` |
| F-2-25 | The browser suite builds with a known 40-character SHA and asserts exact health equality. | `npm run test:browser -- --grep @claim:health` |

Earlier review 1 findings not listed above remain closed: the product uses
**friend**, **audio loop**, plain legal and 404 headings, a compact demo, and
mobile first-screen facts. The browser suite checks the related routes,
metadata, focus movement, unknown-route response, accessibility, and mobile
overflow on every run.
