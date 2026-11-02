# GitHub Pages deployment

User requires using repo-view without hosting a server. Preserve the existing interface and capabilities for public repositories.

GitHub Pages hosts static assets only. Use a browser Web Worker running the existing static analyzer, GitHub REST for metadata/history/tree/actions, and pinned-SHA raw.githubusercontent.com downloads for source. This removes the Node server requirement for the hosted app. The optional existing local Node mode remains available.

Alternative considered: Pages frontend plus an external API. Rejected for this request because it would retain a hosting dependency. A demo-only Pages build would lose real analysis, so it is also unsuitable.

The Pages build uses /repo-view/ as its asset/router base; all analysis stays in the visitor's browser. No tokens are embedded or requested. Public API limits apply per visitor/IP; clear errors and partial-coverage notices remain visible. Worker time limit 180 seconds; existing 5,000-file, 20 MB and 500 KB/file bounds remain. Cache recent snapshots in IndexedDB where supported, with a bounded retention count.

Deploy the tested static artifact using GitHub Actions and GitHub Pages. The user's request authorizes public publication of this already-public project. Verify the deployed URL and a real repository analysis without a Node API.
