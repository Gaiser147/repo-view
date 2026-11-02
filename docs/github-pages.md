# GitHub Pages release

The public application is built with `npm run build:pages` and deployed at `https://gaiser147.github.io/repo-view/`. It does not use the Node API: an internal browser adapter dispatches analysis to a Web Worker, reads public GitHub history directly, and stores optional recent snapshots in IndexedDB.

## Verification before publication

- Typecheck and 25 unit/integration tests passed, including three browser-source tests for public pinned snapshots, default branch/history pagination, oversized files, private repositories and API limits.
- Existing local-mode browser suite: five tests passed.
- Static Pages browser suite: one production-build test passed at `/repo-view/`, covering worker analysis, asset paths, the home link, actual function definitions and absence of local `/api` requests.
- A real static-build analysis of `octocat/Hello-World` returned commit `7fd1a60` without a Node API. The test harness forwarded real upstream responses using the environment's verified TLS/CA path because headless Chromium did not trust the environment proxy certificate; real upstream CORS headers were retained. No TLS verification was disabled.
- Focused independent code review found no Critical or Important issues. Deployment now runs the Pages browser test before uploading its artifact.

## Operation

Pushes to main run `.github/workflows/pages.yml`: typecheck, unit tests, static build and Pages browser test, followed by artifact upload and deployment. Public GitHub API quotas apply per visitor/IP. No personal token is requested, stored or embedded.

The optional Node server and its tests remain available for local use. Browser mode has a 180-second worker deadline, six concurrent bounded downloads, 5,000 files, 20 MB analyzed source and 500 KB/file. Recent cached snapshots expire after five minutes and retention is capped at twelve entries. Browser storage failures are ignored safely.

Minor follow-up: returning to the demo invalidates any pending analysis result, but its worker can continue until it finishes or reaches the deadline. Starting a different real analysis immediately terminates the previous worker. This does not require a hosted service.
