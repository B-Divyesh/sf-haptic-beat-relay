# Polish 1 — review finding closure

Candidate repaired from `1a9cd415c5d3f6db834b57cc1e68f6f58b93b4df` using
[review-1.md](review-1.md). Evidence paths are relative to this directory.

| Finding | Change made | Evidence |
|---|---|---|
| F-1-1 | The final repair commit is deployed with the guarded source-owned rollout, so the immutable image, health SHA, and checkout agree. | `npm run test:live-topology` after deploy; live `/health` |
| F-1-2 | Rebuilt demo entry as a compact live paired round: visible score, returned taps, and start action appear before sample details. | `tests/browser/product.spec.ts` `@claim:demo-sandbox`; `evidence/polish-1/demo-mobile.png` |
| F-1-3 | Compacted the phone hero facts into three short columns. | mobile first-viewport regression; `evidence/polish-1/landing-mobile.png` |
| F-1-4 | Replaced visitor-facing “companion” with “friend” across product copy, docs, demo guide, claims, and audit. | `npm test`; `copy-audit.md` terminology table |
| F-1-5 | Standardized the selected sound as “audio loop.” | `@claim:local-audio`; `copy-audit.md` |
| F-1-6 | Renamed the limits heading to “Vibration varies by browser and device.” | browser route/a11y suite |
| F-1-7 | Renamed the demo exit to “Create a real room.” | `@claim:demo-sandbox`; demo screenshot |
| F-1-8 | Renamed the privacy h1 to “How temporary rooms handle your data.” | route/a11y suite |
| F-1-9 | Renamed the terms h1 to “Terms for using Haptic Beat Relay.” | route/a11y suite |
| F-1-10 | Renamed the 404 h1 to “Page not found.” | unknown-route regression |
| F-1-11 | Split and replaced the overlong README test-suite sentence. | `copy-audit.md` |
| F-1-12 | Removed the overlong clean-entry guarantee from README. | `copy-audit.md` |
| F-1-13 | Removed the overlong clean-entry script description from README. | `copy-audit.md` |
| F-1-14 | Removed the overlong rate-limit prose from README. | `copy-audit.md` |
| F-1-15 | Split singleton wording into two plain sentences. | `copy-audit.md`; live topology claim |
| F-1-16 | Removed the scale-out operator warning from public README. | `copy-audit.md` |
| F-1-17 | Removed the overlong deployment-gate sentence from README. | `copy-audit.md` |
| F-1-18 | Removed the overlong stability-gate sentence from README. | `copy-audit.md` |
| F-1-19 | Rewrote README to an 8-word prose average. | `copy-audit.md` |
| F-1-20 | Removed “unaccelerated browser flow” jargon. | `copy-audit.md` |
| F-1-21 | Removed “deployed relay boundary” jargon. | `copy-audit.md` |
| F-1-22 | Removed stacked failure jargon from README. | `copy-audit.md` |
| F-1-23 | Removed topology implementation prose from public README. | `copy-audit.md` |
| F-1-24 | Removed forwarded-client implementation prose from public README. | `copy-audit.md` |
| F-1-25 | Removed the untested “does not stream/match/include” exclusion sentence. | landing screenshot; `npm test` |
| F-1-26 | Removed the untested runtime-version promise. | README audit |
| F-1-27 | Removed the untested default-port/no-environment promise. | README audit |
| F-1-28 | Removed the untested Vite proxy promise. | README audit |
| F-1-29 | Replaced the unlisted suite-content claim with the executable `npm test` command. | `npm test` |
| F-1-30 | Removed the universal clean-browser-entry guarantee. | README audit |
| F-1-31 | Removed the destructive-scope guarantee. | README audit |
| F-1-32 | Removed the untested audio-playback promise. | README audit |
| F-1-33 | Removed the partly untested service-absence compound claim. | README audit |
| F-1-34 | Removed the unlisted non-root image promise from public docs. | README audit |
| F-1-35 | Removed the unlisted factory build-input promise. | README audit |
| F-1-36 | Removed the unlisted combined-serving promise. | README audit |
| F-1-37 | Removed the unlisted deployment-contract prose. | README audit |
| F-1-38 | Removed the unlisted no-volume/no-database topology prose. | README audit |
| F-1-39 | Removed the unlisted deployment-refusal prose. | README audit |
| F-1-40 | Removed the unlisted deployment-action compound claim. | README audit |
| F-1-41 | Removed the unlisted stability-window promise. | README audit |

Additional hardening: `?demo=1` now enters the isolated sample directly; all
routes update title, description, canonical, Open Graph, and Twitter metadata;
the test suite asserts those route metadata values. The catalog sentence is
verb-first and 75 characters long.
