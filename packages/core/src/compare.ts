import type { RepoSnapshot, SnapshotDiff } from "./index";
import type { CompareResult } from "./github-public";

const generated =
  /(^|\/)(node_modules|dist|build|vendor|coverage|\.next)\/|\.min\.(js|css)$/;
/** Turns one GitHub comparison into the diff the Evolution lens draws, limited to files the analysis shows. */
export function diffFromCompare(
  result: CompareResult,
  snapshot: RepoSnapshot,
): SnapshotDiff {
  const shown = new Set(
      snapshot.nodes.filter((n) => n.kind === "file").map((n) => n.path),
    ),
    diff: SnapshotDiff = { added: [], removed: [], changed: [], renamed: [] };
  for (const f of result.files) {
    if (f.status === "removed") {
      if (!generated.test(f.path)) diff.removed.push(f.path);
    } else if (!shown.has(f.path)) continue;
    else if (f.status === "added" || f.status === "copied")
      diff.added.push(f.path);
    else if (f.status === "renamed" && f.previous) {
      diff.renamed.push({ from: f.previous, to: f.path });
      if (f.changes) diff.changed.push(f.path);
    } else diff.changed.push(f.path);
  }
  return diff;
}
