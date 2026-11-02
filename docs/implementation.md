# Implementation ledger

Plan: Morph + local focus + commit history, approved 2026-11-02.

Seven milestones: demo shell; morph graph; focus and visual craft; real analysis; history; pipelines and health; integration and verification.

Preflight: demo and server share RepoSnapshot, PipelineGraph and HealthReport. Layout and inspector consume the same node IDs. History replaces data atomically.

Execution: inline with a fresh whole-project review at completion. The empty repository is isolated on feat/repo-visualizer.

Constraints: English UI; public GitHub repositories; JS/TS function analysis; 5,000 files / 20 MB text / 500 KB per file; reduced motion and list fallback; no external repository code execution.

## Completion record

All seven implementation milestones are present. Verification evidence is in verification.md.

Ruling: inline execution was used with one fresh whole-project code reviewer and one independent visual finish reviewer; no per-task implementer agents — shared graph/state interfaces favored direct integration.

Ruling: software rendering uses a reduced graphics path and a 10 FPS CI floor; the 30 FPS hardware goal remains unverified — this environment has SwiftShader rather than a physical GPU.

Ruling: initial root directories are the default layer groups; ordered explicit path rules may merge them into semantic layers — inferring architecture labels would misrepresent arbitrary repositories.

Ruling: Git download/cache bounds are monitored at one-second intervals and worker heap is capped at 512 MB — hard per-byte filesystem/network quotas are not provided by Node workers.

The fresh code review's nine Important findings were fixed in one pass with regression coverage. Analyzer cache version was advanced to v2 so older local snapshots cannot reuse invalid eligibility metadata. Deferred scope remains as approved: no private OAuth, editor, runtime telemetry, additional CI providers or two-commit comparison.

Final visual disposition: ship. Reduced-motion geometry invalidation was fixed RED→GREEN with a rendered-image browser regression. Final verification: typecheck, 22 unit/integration tests, production build and 5 browser tests passed.

Ruling: origin/main gained an initial empty README commit during implementation. Integrate that base and deliver the implementation on feat/repo-visualizer through a PR, preserving existing main.

Deferred minors: focused group labels can touch the mode switch; mobile graph counts and history step controls are small.
