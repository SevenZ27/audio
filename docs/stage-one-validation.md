# Stage-one validation — 20 October 2026

Implemented and tested locally on branch `codex/audiomatch-stage-one`, based on `0bb5a9a`. Production has not been deployed.

## Changes

- Malformed product URLs reach the not-found screen instead of crashing the app.
- Core catalog requests and curve panels expose loading, failure and retry states. Requests time out after 12 seconds; failed promises are evicted so retries can succeed. Stale curve responses cannot replace the newly selected rig.
- Audio playback waits for curve data and stops when the selected curves become unavailable.
- The quiz distinguishes in-ear and over-ear. It no longer implies a wired/wireless filter that the catalog cannot support.
- Catalog schema 2 distinguishes 1,510 measurement records, 1,230 model–rig pairs and 1,140 distinct normalized base names. The last count is not a verified physical-product count. Definitions are shared by the build and metadata refresh script.
- README and canonical/social links use `https://audio-chi-ten.vercel.app`. The broken `audiomatch-steven.vercel.app` alias has not been restored.

## Verification

| Check | Result |
|---|---|
| TypeScript build | Passed |
| Vite production build | Passed |
| Vitest | 18 passed |
| Python pipeline tests | 15 passed |
| Playwright on local production build | 28 passed: 14 scenarios at 375 px and 1440 px |
| Visual inspection | Desktop home and mobile product/quiz/catalog screenshots inspected |
| Scoped Impeccable mechanical audit | No detector findings |
| Whitespace check | Passed |

Browser tests cover normal navigation, search, quiz, keyboard/click map interaction, product charts, Web Audio A/B filter gains, reduced motion, malformed links, failed core requests, failed/malformed curve responses, retries, pending-request rig changes, catalog counts and mobile width. Audio checks verify browser state and filter gains, not perceptual fidelity; playback was muted during automation.

The host antivirus injected a request to `gc.kis.v2.scr.kaspersky-labs.com` during local HTTP tests. The test records that exact host as an environment annotation while continuing to reject other external application requests. No host security settings were changed. Mobile map and quiz tests use actual visible click targets rather than forced clicks on obscured SVG points or hidden radio inputs.

After a final copy cleanup and indentation-only change, TypeScript, Vite and all 18 unit tests passed again; home browser checks were repeated against the rebuilt output.

## Reproduction

Install JavaScript dependencies with `npm ci`. Install Python dependencies from the pipeline requirements before running its tests. Then run:

```sh
npm run build
npm test
npm run test:pipeline
npm run test:e2e
```

Use an installed Chromium via `PW_CHROMIUM` or install the Playwright Chromium browser. Browser tests start their own production preview on port 4171. This machine used the bundled Node/Python runtimes, Chrome and a temporary ignored pytest directory; direct Node script entry points were used because the host pnpm launcher hit a sandbox symlink restriction.

## Boundaries

Only catalog metadata was refreshed. Exported measurements, curves, neighbors, map coordinates and rankings were preserved; a complete AutoEq download/rebuild was not performed. Source revision pinning, canonical physical-product identities, verified connectivity metadata, recommendation evaluation and user testing remain separate follow-up work.

The Vercel connector returned 403 when reading project domains. Local fixes do not repair account-level aliases or publish production. Browser coverage here is Chromium at two viewport sizes, not a claim of testing every browser or real device.
