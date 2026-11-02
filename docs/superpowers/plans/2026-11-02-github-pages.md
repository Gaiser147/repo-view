# GitHub Pages implementation

User requested direct use without self-hosting. Preserve Morph UI, history, dependencies, functions, workflows and rating.

1. Extract public GitHub metadata/history access and browser-safe source download; test pinned-SHA analysis, skipped oversized files, real default branches and rate-limit/private errors.
2. Run the shared analyzer in a browser Worker, with bounded concurrent raw downloads, 180-second termination and optional bounded IndexedDB cache. Keep existing local server mode.
3. Build Vite Pages mode at /repo-view/, route internal analysis calls to the browser adapter, and verify fonts/assets/workers plus a real analysis from the static build without any server API.
4. Add GitHub Pages Actions publication on main and CI static-host tests. Review changes and confirm normal mode tests remain green.
5. Enable Pages, integrate the tested change, wait for deployment, and verify the public URL and a public repository analysis.
