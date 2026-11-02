# repo-view

Explore the shape, architecture and evolution of a GitHub repository.

An interactive 3D code cloud morphs into layers without losing node identity. Unfold one package locally, follow resolved dependencies and function calls, scrub through commit snapshots, inspect GitHub Actions workflows, and open the evidence behind a structural health rating.

## Use on GitHub Pages

**https://gaiser147.github.io/repo-view/**

The hosted version needs no server or installation. It analyzes public repositories in a browser Web Worker, reads metadata/history/workflows directly from GitHub, and downloads bounded source files from pinned commit URLs. No GitHub token is embedded or requested. GitHub's unauthenticated public API quota applies per visitor/IP; rate-limit errors explain when to retry. Private repositories are not supported.

Commit snapshots are reused immediately during a session and cached in IndexedDB for up to seven days (24 snapshots, bounded by 100,000 nodes). Unchanged source blobs are reused across commits in a separate 20 MB cache. While idle, a paced background queue prepares neighboring commits: a 2.5-second initial delay, at least four seconds between attempts, and at most six attempts per repository per hour in the current session. Foreground navigation takes priority; warming pauses during playback or while the tab is hidden. Settings can disable warming, and data-saver connections start with it disabled. Background caching also pauses when the API reports 20 or fewer remaining requests. The history displays the remaining allowance and reset time; server rate-limit cooldowns are respected across analysis workers and page reloads. Cache storage failure does not prevent analysis. Analysis still uses the 5,000-file, 20 MB text and 500 KB/file bounds and a 180-second worker deadline. Git download/cache and Node heap limits described below apply only to the optional Node server mode.

Every push to `main` builds and deploys the static site through `.github/workflows/pages.yml`. GitHub Pages must use the **GitHub Actions** build source. To preview the same static build locally:

```sh
npm ci
npm run build:pages
npm run preview:pages
```

Open **http://localhost:4173/repo-view/**. The project base path is configured in the Vite Pages mode; forks using another repository name must change that base path. The local server-backed mode below remains optional.

## Run locally

Requires **Node.js 24+**, npm and Git on your PATH.

```sh
npm ci
npm run dev
```

Open **http://localhost:5173**. The app starts with a clearly labeled, deterministic demo with 50 commits. Use the repository dropdown to analyze a public `https://github.com/owner/repository` URL. An optional branch/ref can be entered in the same form.

For a production build:

```sh
npm run build
npm start
```

The Node service serves both the API and frontend at **http://localhost:3001**. Set `PORT` to change it. Copy `.env.example` to `.env` to optionally configure a server-only `GITHUB_TOKEN`; it raises GitHub API limits but does not enable private-repository analysis. Without a token, GitHub's public rate limit applies. Standard proxy environment variables are respected by the Node 24 launcher.

No repository scripts, dependencies, hooks or workflow steps are executed during analysis. Public repositories only. The server requires write access to `.cache/` and HTTPS access to GitHub. The application is intended to run locally or behind an access-controlled server; it does not include an authentication system for a public multi-user deployment.

## Explore

- **Cloud / Layers** morphs the same graph over 1.5 seconds. Drag to orbit, scroll or use +/− to zoom, and use Fit to frame the codebase. On tablets, pinch to zoom and use two fingers to pan.
- Click the current branch name to search loaded branches, load further branch pages, or enter a branch name directly. Switching branches replaces the timeline with that branch’s history.
- **Groups** focuses or hides individual groups in either spatial layout. **Only** isolates one group; **Show all groups** restores the full codebase. Selecting a hidden file through Files/search reveals it.
- Click a point, search result or tree entry to open the Inspector. Zoom closer to reveal functions and detail labels; the detail indicator shows the current level. Files and search provide equivalent navigation.
- The toolbar independently hides Files, Inspector, History and CI. Expand cloud hides these panels and enters fullscreen where supported; exiting restores the previous layout. On tablets, Files and Inspector use a single drawer. Keyboard: F expands, +/− zoom, 0 fits and Escape dismisses the active surface.
- Dependencies, Functions and Pipelines open dedicated workspaces with Back to cloud and Close controls. Search dependencies/functions, follow resolved calls, locate items in the cloud, or zoom and scroll workflow diagrams.
- Use a group's focus icon to unfold it locally. Escape closes focus. Switching to global Layers retains selection and closes local focus.
- Commit controls load actual snapshots atomically. Uncached history steps use one tree API call for a pinned SHA and reuse unchanged source blobs. Live CI results are omitted for historical snapshots to conserve requests; workflow structure remains available. Added and changed elements are highlighted using the Changes color mode; removed elements appear in the diff summary. Playback waits for each snapshot.
- Pipelines shows workflow job dependencies and step details. Run states are matched to workflow path and exact job name. Matrix/expressions that cannot be matched remain unassessed.
- Settings includes color modes, node size, animation/performance options and ordered layer rules such as `apps/**=0`. First matching rule wins. Unmatched files remain in Unassigned.
- File tree and Inspector remain available without WebGL. Reduced-motion preferences disable decorative animation and use immediate layout changes.

## Analysis and limits

Structure, file sizes and language detection work across languages. Function definitions, local imports and statically resolvable calls are analyzed for JavaScript and TypeScript using the TypeScript compiler's binding and type information. Unresolved/dynamic calls are not presented as proven links. LOC counts non-empty text lines. Complexity counts decision branches; it is a heuristic, not a proof of correctness.

Dependencies are read from manifests and supported npm, pnpm and Yarn lockfiles. GitHub Actions YAML supplies jobs, `needs` and steps. Run results come from GitHub for the selected commit; missing data stays explicitly unavailable. Other CI providers are not included.

Bounds: **5,000 files**, **20 MB text**, **500 KB per file**, **100 MB Git cache per repository**, and a **180-second analysis deadline**. Oversized/missing blobs, binary files and unsupported relationships are reported through coverage rather than fabricated. Common generated/vendor directories are excluded. Git uses a bounded partial fetch; network/filesystem monitoring has a one-second interval, so transfer limits are best-effort bounds rather than an exact byte-level quota. Cache entries are keyed by repository, SHA and analyzer version. Delete `.cache/` while the service is stopped to reclaim storage; automatic global cache eviction is not implemented.

Health uses documented rules: maintainability 40%, dependency cycles 35%, CI structure/results 25%. Open Health for thresholds, formulas and file links. An overall score requires all categories and at least 80% text analysis coverage. Security and test coverage are not scored without their sources. The demo is illustrative, including its pipeline states and rating.

## Verify

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser suite includes desktop/mobile navigation, direct point selection, pinch zoom, panel and fullscreen controls, closeable analysis workspaces, morph/focus, search, commit changes, invalid input, reduced motion, and a reproducible 5,000-file benchmark. `npm run test:pages` additionally checks static hosting and paced history caching without an API server. Its CI floor is 10 FPS on Chromium's software renderer; the hardware target is 30 FPS and depends on GPU, resolution and graph density. Initial results are recorded in `docs/verification.md`; the usability updates are recorded in `docs/usability-verification.md` and `docs/exploration-controls-verification.md`.

## Project structure

- `apps/web`: React interface, WebGL renderer, layout worker and shared selection/history state.
- `apps/server`: Fastify API, bounded analysis jobs, GitHub access, isolated analysis workers and SQLite snapshot cache.
- `packages/core`: graph contracts, static analysis, deterministic layout, snapshot diff, demo data and explainable health rules.

The initial API supports starting/polling analyses, reading commit pages, and retrieving analyzed snapshots and their pipelines. No authentication, runtime telemetry, private-repo OAuth, or code editor is included.
