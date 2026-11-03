import type { CodeNode, Commit, RepoSnapshot } from "./index";

export interface FileHistory {
  /** Commits in which the file's content hash changed (or the file appeared) among compared pairs. */
  changes: number;
  lastAuthor?: string;
  lastSha?: string;
}
export interface HistoryCoverage {
  /** Consecutive commit pairs that could be compared because both snapshots are known. */
  compared: number;
  /** Consecutive commit pairs in the loaded history. */
  total: number;
}
export interface History {
  files: Map<string, FileHistory>;
  coverage: HistoryCoverage;
  /** Lines of code per commit sha, for snapshots that are known. */
  loc: Map<string, number>;
  /** Files changed by each commit, for commits whose parent snapshot is known. */
  changedPerCommit: Map<string, number>;
}

/**
 * Derives per-file change counts and last authors from the snapshots that are
 * actually available. Pairs with a missing snapshot are skipped and counted in
 * coverage instead of being guessed.
 */
export function fileHistory(
  commits: Commit[],
  known: (sha: string) => RepoSnapshot | undefined,
): History {
  // Commits arrive newest first, in the repository's own order; author dates can be out of order.
  const chronological = [...commits].reverse(),
    files = new Map<string, FileHistory>(),
    loc = new Map<string, number>(),
    changedPerCommit = new Map<string, number>();
  let compared = 0,
    previous: Map<string, string> | undefined;
  for (const commit of chronological) {
    const snapshot = known(commit.sha);
    if (!snapshot) {
      previous = undefined;
      continue;
    }
    const current = new Map(
      snapshot.nodes
        .filter((n) => n.kind === "file")
        .map((n) => [n.path, n.hash]),
    );
    loc.set(
      commit.sha,
      snapshot.nodes
        .filter((n) => n.kind === "file")
        .reduce((s, n) => s + n.loc, 0),
    );
    if (previous) {
      compared++;
      let count = 0;
      for (const path of previous.keys()) if (!current.has(path)) count++;
      for (const [path, hash] of current)
        if (previous.get(path) !== hash) {
          count++;
          const entry = files.get(path) ?? { changes: 0 };
          entry.changes++;
          entry.lastAuthor = commit.author;
          entry.lastSha = commit.sha;
          files.set(path, entry);
        }
      changedPerCommit.set(commit.sha, count);
    }
    previous = current;
  }
  return {
    files,
    loc,
    changedPerCommit,
    coverage: { compared, total: Math.max(0, chronological.length - 1) },
  };
}

/** Summed decision-branch complexity of a file's analyzed functions; undefined when no function was analyzed. */
export function fileComplexity(snapshot: RepoSnapshot): Map<string, number> {
  const byFile = new Map<string, number>();
  for (const n of snapshot.nodes)
    if (n.kind === "function" && n.parent)
      byFile.set(n.parent, (byFile.get(n.parent) ?? 0) + (n.complexity ?? 1));
  return byFile;
}

export interface Hotspot {
  node: CodeNode;
  changes: number;
  complexity: number;
  /** 0–100, relative to the strongest hotspot in this snapshot. */
  score: number;
}

/**
 * Ranks files by change frequency × summed complexity. Files without analyzed
 * functions are not ranked. With no compared history the ranking falls back
 * to complexity alone and says so through `mode`.
 */
export function hotspots(
  snapshot: RepoSnapshot,
  history: History,
): { mode: "churn-complexity" | "complexity-only"; items: Hotspot[] } {
  const complexity = fileComplexity(snapshot),
    mode =
      history.coverage.compared > 0 ? "churn-complexity" : "complexity-only";
  const raw = snapshot.nodes
    .filter((n) => n.kind === "file" && complexity.has(n.id))
    .map((node) => {
      const changes = history.files.get(node.path)?.changes ?? 0,
        c = complexity.get(node.id)!;
      return {
        node,
        changes,
        complexity: c,
        value: mode === "complexity-only" ? c : changes * c,
      };
    })
    .filter((h) => h.value > 0)
    .sort(
      (a, b) => b.value - a.value || a.node.path.localeCompare(b.node.path),
    );
  const max = raw[0]?.value ?? 1;
  return {
    mode,
    items: raw.map(({ value, ...h }) => ({
      ...h,
      score: Math.round((value / max) * 100),
    })),
  };
}

export interface AuthorShare {
  author: string;
  files: number;
}
/** Authors ranked by the number of files whose latest known change they made. */
export function authorship(
  snapshot: RepoSnapshot,
  history: History,
): { ranked: AuthorShare[]; unknown: number } {
  const counts = new Map<string, number>();
  let unknown = 0;
  for (const n of snapshot.nodes)
    if (n.kind === "file") {
      const a = history.files.get(n.path)?.lastAuthor;
      if (a) counts.set(a, (counts.get(a) ?? 0) + 1);
      else unknown++;
    }
  return {
    ranked: [...counts]
      .map(([author, files]) => ({ author, files }))
      .sort((a, b) => b.files - a.files || a.author.localeCompare(b.author)),
    unknown,
  };
}
