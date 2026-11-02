# Exploration controls verification — 2 November 2026

Follow-up to the usability release. Environment: Node 24.19.0, Linux, Chromium 156 with SwiftShader; tablet and phone use touch emulation.

## Behavior

- Spatial labels use compact translucent 22px surfaces and 10px text. Package headings recede at function detail unless focused/selected. One screen-space collision pool handles both heading and detail labels. Newly mounted labels update their positions even when reduced-motion rendering is otherwise idle. Point picking and Files/search remain touch alternatives to the small annotations.
- The branch name opens a searchable list with 100-entry pagination and manual branch entry. Successful changes replace snapshot and branch history together. Loading, failure and retry states preserve the current repository. Demo is explicitly limited to its illustrative branch.
- Groups provides visibility checkboxes, Focus, Only, Hide groups outside focus, and Show all groups in both layouts. Selection and focus reveal their target. Focus clears if a new branch/commit removes its group. Layers uses an elevated camera and frames an isolated group's files rather than its heading at the lane edge.
- Distant views retain file points and file-based atmospheric positions while aggregating relationships by package. The cloud silhouette remains visible beyond the old 40-unit detail threshold.

## GitHub request budget

Pinned history analysis now uses one recursive tree API request, omitting repeated repository metadata, SHA resolution and live CI lookups. Workflow definitions still render; historical snapshots explicitly state that live CI results were not loaded. Initial branch/ref analysis can still load current run data.

Workers, history and branch listing share a serialized browser API client. Mutable metadata is reused for two minutes. Background caching stops at 20 reported remaining requests; foreground requests retain a final one-request reserve. Remaining requests/reset time appear in history. Rate-limit reset and Retry-After are tracked separately and retained locally across page reloads. Each network request combines a 30-second deadline with cancellation; cancelled jobs release their pending work.

The immutable snapshot cache version was incremented for the changed analysis behavior. Existing source blobs can still be reused. These changes conserve the public GitHub quota; they cannot remove the unauthenticated limit or account for unrelated traffic on the same IP before GitHub reports it. The optional Node service supports branch listing; the shared browser quota broker applies to GitHub Pages.

## Verification

- TypeScript and **42 unit/integration tests across 14 files passed**.
- **14 exploration browser tests passed**, including direct branch access, group isolation/restoration, far-view file retention, reduced-motion label separation, and elevated/framed tablet layers, plus the existing picking/pinch/fullscreen/navigation tests.
- **3 Pages tests passed**. The new fixture loads four uncached history commits with exactly four additional tree calls, pauses warming at 19 remaining requests without sending another call, switches to `feature/ui` and replaces history, then advances using one further request.
- Both normal and Pages production builds passed.
- The final 5,000-file/5,000-edge software-renderer benchmark measured **25.0 FPS**, above the 10 FPS CI floor. Physical GPU and real iPad/Safari remain unverified.

The regression cases were observed failing before correction: pinned requests used three API calls; distant views retained no file nodes; focus survived removal of its group; a primary reset erased Retry-After; detail labels overlapped; and isolated layers were edge-on/clipped. The initial Pages integration also caught an unbound native fetch call, and the existing mobile test caught toolbar wrapping over the panel controls; both were corrected.

## Independent finish review

Code review identified four material edge cases: secondary cooldown reset, missing focused groups, dropped worker request deadlines and focusing hidden groups through Files. All were corrected. The visual reviewer inspected six settled desktop/tablet/phone captures, then confirmed only the two affected views after correction: label overlap and isolated-layer framing were **resolved**, disposition **ship**. Captures are retained locally in `.impeccable/review/controls/` and ignored by Git. No broad redesign or additional polish cycle was performed.
