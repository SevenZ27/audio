# UX and audio release checks

Local branch: `codex/audiomatch-ux-audio`, based on `c672d3a`. Production is unchanged.

## Changes

- Home sections stay mounted but hidden while a product detail is open. Search selection/query, quiz answers/results, map state and comparison pair survive detail navigation. This state is in memory and resets on reload.
- “Bandingkan & dengar” opens the selected query and candidate directly. The comparison includes both curves, a difference summary, same-rig B search, swap and detail links.
- Return controls restore the initiating section, scroll position and focus when the initiating DOM control remains mounted. Browser Back/Forward preserves the same results. A direct product link falls back to search.
- All navigation links remain available in the mobile horizontally scrollable navigation. Touch selection and navigation were tested explicitly.
- Audio uses cancellable asynchronous startup, explicit starting/error/playing states, lower initial volume (30%), smoothed EQ changes and cleanup of scheduled sources. Pair changes, hidden tabs and detail navigation stop playback; detail navigation closes its context.
- A/B mode is described as an EQ illustration. The preamp is an estimate, not a measured loudness match. Choosing B does not imply the listener owns headphone A or hears the physical sound of B.

## Verification

TypeScript and the production build passed. All 19 existing unit tests passed. One sandbox Vite temporary-file failure was resolved by running the same unit suite outside the sandbox; no failed test was excluded.

The full existing-plus-journey browser run passed 40 tests. Seven additional checks passed in scoped runs: native filter/lifecycle diagnostics at both sizes, leaving during pending resume at both sizes, a mobile-only touch-navigation test, and skip-link keyboard focus at both sizes. This gives 47 applicable browser cases; the touch-only test is intentionally skipped in the desktop project. Browser checks use the built production output, 1440 × 900 desktop and 375 × 812 touch-enabled mobile Chromium. The mobile mode is emulation, not physical-device or Safari testing.

Covered flows include search → comparison → swap → detail → comparison → original results; completed quiz → detail → browser Back/Forward → original results; malformed/direct links; recoverable catalog/curve failures; start/cancel/retry; audio rejection; pair changes; volume zero; hidden-tab pause; same-product zero EQ; and closing an active or pending audio session on navigation.

Desktop/mobile comparison screenshots were visually inspected, and the mechanical Impeccable detector returned no findings. The comparison stayed within the mobile viewport. The native audio benchmark checks actual filter response and source cleanup separately from the app's displayed target gains; see [audio measurements and limitations](audio/report.md).

## Run locally

```sh
npm test
npm run build
npm run test:e2e
```

Set `PW_CHROMIUM` to an installed Chrome executable if Playwright Chromium is unavailable. Stop the local preview on port 4171 before E2E tests; the tests start their own server. Speaker output is muted during browser automation.

No listening-study claims, recommendation accuracy claims, catalog changes, production deployment or physical-device certification are included in this stage.
