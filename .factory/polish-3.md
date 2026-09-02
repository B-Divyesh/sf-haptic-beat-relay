# Polish 3 — complete adversarial finding closure

This document maps every finding from reviews 1–3 to the shipped change and
its verification. Screenshots are cold captures at the named live URL. All
browser checks use fresh contexts.

| Finding | Change made | Evidence |
|---|---|---|
| F-1-1 | The final candidate is deployed through the guarded release command. | `npm run test:live-topology`; `https://haptic-beat-relay.sociobot.in/health` |
| F-1-2 | The sample round, seeded score, taps, and start action are in the first view. | `@claim:demo-sandbox`; `evidence/polish-3/demo-390x844.png`; live `/?demo=1` |
| F-1-3 | The compact hero keeps all facts in both required first views. | first-viewport regression; `evidence/polish-3/landing-390x844.png`; live `/` |
| F-1-4 | Visitor copy uses **friend** for the second participant. | `copy-audit.md`; route browser suite |
| F-1-5 | Visitor copy uses **audio loop** for selected local sound. | `copy-audit.md`; `@claim:local-audio` |
| F-1-6 | The limits heading names browser and device vibration support. | browser route suite; live `/` |
| F-1-7 | Demo exit says **Create a real room**. | `@claim:demo-sandbox`; live `/?demo=1` |
| F-1-8 | Privacy h1 names temporary-room data handling. | browser route suite; live `/privacy` |
| F-1-9 | Terms h1 names the terms page. | browser route suite; live `/terms` |
| F-1-10 | The 404 h1 is **Page not found**. | 404 browser test; live `/missing-page` |
| F-1-11 | The old test-suite sentence remains removed. | `copy-audit.md`; README review |
| F-1-12 | The old clean-entry guarantee remains removed. | `copy-audit.md`; README review |
| F-1-13 | The old destructive-scope sentence remains removed. | `copy-audit.md`; README review |
| F-1-14 | The old rate-limit prose remains removed. | `copy-audit.md`; README review |
| F-1-15 | The old replica explanation remains removed. | `copy-audit.md`; README review |
| F-1-16 | The old scale warning remains removed. | `copy-audit.md`; README review |
| F-1-17 | Deployment prose remains short, imperative instructions only. | `copy-audit.md`; README review |
| F-1-18 | The old stability promise remains removed. | `copy-audit.md`; README review |
| F-1-19 | README average remains below 14 words and every sentence is at most 22 words. | `copy-audit.md` |
| F-1-20 | The old browser-flow jargon remains absent. | `copy-audit.md`; README review |
| F-1-21 | The old relay-boundary jargon remains absent. | `copy-audit.md`; README review |
| F-1-22 | The old failure-test jargon remains absent. | `copy-audit.md`; README review |
| F-1-23 | The old hosting jargon remains absent. | `copy-audit.md`; README review |
| F-1-24 | The old forwarded-client jargon remains absent. | `copy-audit.md`; README review |
| F-1-25 | The unproved exclusion sentence remains removed. | landing browser suite; live `/` |
| F-1-26 | The unproved runtime-version promise remains removed. | README review |
| F-1-27 | The unproved default-environment promise remains removed. | README review |
| F-1-28 | The unproved Vite-proxy promise remains removed. | README review |
| F-1-29 | README names the executable test command without promising internals. | `npm test`; README review |
| F-1-30 | The universal clean-browser claim remains removed. | `test:clean-entrypoint`; README review |
| F-1-31 | The destructive-scope guarantee remains removed. | `copy-audit.md`; README review |
| F-1-32 | The failed-loop status now directs visual cues and makes no audible-output promise. | `@claim:tempo-and-loop-controls`; live `/host` |
| F-1-33 | Privacy absence copy stays within account and request claims. | `@claim:no-account`; `@claim:no-third-party`; live `/privacy` |
| F-1-34 | The non-root image promise remains out of public copy. | README review |
| F-1-35 | The factory-build-input promise remains out of public copy. | README review |
| F-1-36 | The combined-serving promise remains out of public copy. | README review |
| F-1-37 | The deployment-contract sentence remains out of public copy. | README review |
| F-1-38 | The unproved topology sentence remains out of public copy. | README review |
| F-1-39 | The deployment-refusal promise remains out of public copy. | README review |
| F-1-40 | The compound deployment-action claim remains out of public copy. | `test:deployment-contract`; README review |
| F-1-41 | The release stability promise remains out of public copy. | README review |
| F-2-1 | The final candidate is deployed as its immutable build identity. | `npm run test:live-topology`; live `/health` |
| F-2-2 | Deployment copy remains short and non-promissory. | `copy-audit.md`; README review |
| F-2-3 | Reconnect test jargon remains absent from public docs. | `copy-audit.md`; README review |
| F-2-4 | Hosting terms remain absent from public docs. | `copy-audit.md`; README review |
| F-2-5 | No deployment-behavior claim is made in the README. | README review; `test:deployment-contract` |
| F-2-6 | The remaining failed-loop branch now offers visual recovery only. | `@claim:tempo-and-loop-controls`; live `/host` |
| F-2-7 | Privacy copy is limited to tested accounts and request behavior. | `@claim:no-account`; `@claim:no-third-party` |
| F-2-8 | The first-screen audience names phone vibration and a timing score. | first-viewport regression; live `/` |
| F-2-9 | The local deployment note remains removed. | README review |
| F-2-10 | The test-runtime promise remains removed. | README review |
| F-2-11 | Protocol vocabulary remains absent from public README prose. | README review |
| F-2-12 | Hosting vocabulary remains absent from public README prose. | README review |
| F-2-13 | Demo, Join, and Privacy remain visible at 390 px. | mobile route suite; `landing-390x844.png` |
| F-2-14 | Landing data copy remains limited to tested two-hour expiry. | `@claim:ephemeral-rooms`; live `/` |
| F-2-15 | The host calls it a room, not a private room. | host route browser suite; live `/host` |
| F-2-16 | Copy-room success and blocked fallback remain claim-tested. | `@claim:copy-room-link` |
| F-2-17 | The 104 BPM sample copy has a measured tempo test. | `@claim:sample-tempo`; live `/?demo=1` |
| F-2-18 | Unproved stored-data inventory remains removed. | privacy route review; live `/privacy` |
| F-2-19 | Unproved network-address retention prose remains removed. | privacy route review |
| F-2-20 | SQLite path selection remains tested across all fallback paths. | `@claim:database-path` |
| F-2-21 | The environment setting is stated through its tested selection claim. | `@claim:database-path`; README review |
| F-2-22 | Rate-limit storage prose remains removed. | README review |
| F-2-23 | Generic rollout causality prose remains removed. | README review |
| F-2-24 | Space on the joined tap pad remains claim-tested. | `@claim:space-key-tap` |
| F-2-25 | Health uses an exact known build identity in browser verification. | `@claim:health` |
| F-3-1 | The repair is released only with the immutable guarded command. | `npm run test:live-topology`; live `/health` |
| F-3-2 | Desktop demo now uses a paired stage layout with visible seeded result. | `@claim:demo-sandbox`; `evidence/polish-3/demo-1440x900.png`; live `/?demo=1` |
| F-3-3 | Hero copy and spacing keep all three facts above 900 px. | first-viewport regression; `evidence/polish-3/landing-1440x900.png`; live `/` |
| F-3-4 | Failed audio playback says to continue with visual cues. | `@claim:tempo-and-loop-controls`; live `/host` |
| F-3-5 | Handoff keeps the exact guarded deploy command and identity check. | `npm run test:handoff-contract` |
| F-3-6 | Tempo/local-loop controls are listed and measured; shared-score claim names join activation. | `@claim:tempo-and-loop-controls`; `@claim:shared-score` |
| F-3-7 | Public records claim checks MIT text, version, generated-source SHA, and provenance. | `@claim:public-records`; live `/terms` |
| F-3-8 | Removed the two decorative landing labels. | landing browser suite; `landing-1440x900.png`; live `/` |

## Screenshot evidence

- `evidence/polish-3/landing-1440x900.png` — landing facts visible at 1440 × 900.
- `evidence/polish-3/landing-390x844.png` — landing facts visible at 390 × 844.
- `evidence/polish-3/demo-1440x900.png` — seeded 86% sample state visible at 1440 × 900.
- `evidence/polish-3/demo-390x844.png` — seeded 86% sample state visible at 390 × 844.
