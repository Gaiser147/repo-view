# Explorer usability verification — 2 November 2026

Environment: Node 24.19.0, npm 11.9.0, Linux, Chromium 156 with ANGLE/SwiftShader. Browser checks used the real WebGL scene; tablet checks used Chromium touch emulation rather than a physical tablet.

## Changes verified

- Pixel-distance point picking excludes decorative particles, handles depth ties, and distinguishes a tap from dragging/pinching. Package labels retain selection. Files/search remain alternative navigation paths.
- Visible zoom controls, wheel and pinch reveal file/function details. Function positions remain close to their owning file. Camera focus, Locate and Fit share the rendered focus/custom-layer position calculation.
- Files, Inspector, History and CI can be hidden independently. Fullscreen restores the previous panel state. Tablet Files/Inspector share a drawer, and touch controls are at least 44px.
- Dependencies, Functions and Pipelines are closeable workspaces. Workflow diagrams scroll and zoom within the workspace at desktop and tablet widths.
- Commit snapshots are reused from memory/IndexedDB before starting a new analysis. Slow neighbor preparation yields to foreground requests; unchanged source blobs are shared across commits. Returning to the current commit cancels a different pending selection.

## Automated evidence

- TypeScript check: passed.
- Unit/integration checks: **35 tests across 13 files passed**. New coverage includes pixel picking, function proximity, focused/custom-layer positions, cache lifetime and reuse, paced background scheduling/cancellation/budget, and the pending-history race.
- Browser checks: **10 passed**, including direct projected-point selection, zoom/detail, fullscreen, view dismissal, panel controls, touch pinch and single-drawer behavior, focus framing, native browser shortcuts and the existing exploration/reduced-motion cases.
- The 5,000-file/5,000-edge benchmark at 1440×1000 measured **13.8 FPS** with SwiftShader during the final suite, above the 10 FPS software CI floor. Earlier runs varied with concurrent browser work; this is not evidence for the 30 FPS physical-GPU target.
- Pages production build and static browser checks: **2 passed**. The hosted-subpath fixture makes no local API requests. A three-commit cache fixture verifies adjacent snapshots become available, revisiting them adds no tree requests, and unchanged source is downloaded **once**.

The first restricted-shell subprocess test run returned an empty child-process output and failed the existing output-budget test. Running the complete suite with the normal network-enabled execution permissions passed all 35 tests; no subprocess implementation or expectation was weakened.

## Independent critique and finish review

Two independent baseline reviews assessed the original interface at **20/40**, with the largest issues in user control, efficient exploration and panel density. The evidence and priorities are archived in [.impeccable/critique/2026-11-02-explorer.md](../.impeccable/critique/2026-11-02-explorer.md). This baseline score is not an automated before/after comparison.

A fresh code review found two material issues in the changes: camera focus used untransformed coordinates, and a pending commit could override reselecting the current commit. Both were corrected with regression tests. Browser shortcut interference and cache-budget wording were also corrected.

The visual reviewer inspected nine settled desktop/tablet/mobile captures and found oversized package labels during close zoom. Labels now retain their screen size; the requested targeted recaptures were reviewed as **resolved**, with a **ship** disposition. No further visual pass was requested. Local screenshots are retained under `.impeccable/review/usability/` (ignored by Git).

## Boundaries

- Physical iPad/Safari, other browsers, physical-GPU performance and a full accessibility audit remain unverified.
- GitHub calls are deterministically intercepted in the Pages tests. Production quota exhaustion and adverse real-network timing were not simulated; unauthenticated GitHub quotas still apply.
- Cached commit source is immutable, but CI run metadata is a snapshot of analysis time and can become stale during the seven-day cache lifetime.
- Background preparation is bounded and optional. It does not guarantee every historical commit is ready, and the six-attempt hourly allowance is per repository in the current browser session.
- Cache/storage failure falls back to analysis. No repository code or workflow steps are executed.
