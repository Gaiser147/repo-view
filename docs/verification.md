# Verification — 2 November 2026

Environment: Node 24.19.0, npm 11.9.0, Linux x86_64, Chromium 156 headless using ANGLE/SwiftShader. No physical GPU was available.

## Automated checks

- TypeScript check: passed.
- Unit/integration suite: 22 tests across 8 files passed. Covers static symbol resolution and shadowing, cycle detection, unread/malformed-code rating gates, manifest-specific lockfile versions, worker messages, bounded subprocess termination, API jobs, default branches, stale history responses, renamed selections, deterministic layouts and hierarchical package aggregation.
- Production build: passed. Main bundle ~309 KB and lazily loaded 3D bundle ~1,065 KB before gzip.
- Browser suite: 5 tests passed, covering explore/morph/focus/search/history/health/pipelines, invalid input, mobile/reduced motion, and a 5,000-file stress fixture.
- Production server smoke check: `/` and `/api/health` both returned HTTP 200.

## Real repositories

- `octocat/Hello-World`: default branch correctly returned `master`; 3 commits; a real snapshot with 1 file analyzed successfully.
- `ai/nanoid`: 50 initial commits; 46 files, 45 analyzed text files, 142 function definitions, 5 workflow jobs. One skipped file was explicitly reported as partial coverage.

The live checks depend on GitHub availability and public API limits, and are not part of the deterministic CI suite.

## Rendering

The 5,000-file / 5,000-edge fixture at 1440×1000 measured **16.1 FPS** in the final software-renderer run. Earlier unrestricted bloom measured ~5 FPS, which motivated explicit weak-renderer detection, reduced pixel density, disabled bloom and reuse of unchanged geometry. Intermediate fallback runs measured 16.5 and 21.0 FPS. The software CI floor is 10 FPS. **The 30 FPS hardware target has not been verified on a physical GPU.**

Desktop (1586×992), Layers, local Focus and mobile (390×844) screenshots are retained locally under `.impeccable/review/`. The final capture reported no browser runtime errors and no horizontal overflow on mobile. Desktop glow captures explicitly enabled normal graphics mode; the mobile capture uses automatic performance mode.

## Independent review

A fresh code reviewer identified nine Important findings, all addressed with targeted checks: analysis eligibility for health; stale older history; default branch identity; pipeline DAG traversal cost; lockfile scoping; subprocess failure/cleanup; hierarchical semantic zoom; distinct default layers; camera-target-relative zoom distance.

Keyboard/list access was also made expandable rather than silently dropping later entries. Unsupported-language function analysis is labeled unavailable. Camera focus now respects reduced motion.

## Remaining boundaries

- Physical GPU performance, broad cross-browser compatibility and a full accessibility audit remain unverified.
- Static analysis cannot prove dynamic calls, arbitrary module aliases or runtime behavior. No repository code is executed.
- Run matching requires exact workflow/job-name correspondence; ambiguous matrix/custom names remain unavailable.
- Download/storage bounds are monitored at one-second intervals; they are not byte-exact quotas. Worker heap is capped at 512 MB; cache eviction is manual.
- Public hosting, private repositories, authentication, runtime telemetry and two-commit comparison are not included.

Visual finish review: **ship** after a reduced-motion layout invalidation defect was reproduced by a failing screenshot regression, corrected, and verified by passing tests and settled endpoint captures. Two minor visual observations remain: a focus label can touch the mode switch, and mobile counts/step controls are small. These were explicitly judged non-blocking.
