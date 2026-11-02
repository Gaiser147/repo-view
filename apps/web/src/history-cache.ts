import type { Commit, RepoSnapshot } from "../../../packages/core/src/index";
export class SnapshotMemory {
  private entries = new Map<string, RepoSnapshot>();
  constructor(
    private limit = 12,
    private nodeBudget = 100000,
  ) {}
  get(repository: string, sha: string) {
    const key = `${repository}:${sha}`,
      value = this.entries.get(key);
    if (value) {
      this.entries.delete(key);
      this.entries.set(key, value);
    }
    return value;
  }
  put(snapshot: RepoSnapshot) {
    const key = `${snapshot.repository}:${snapshot.sha}`;
    this.entries.delete(key);
    this.entries.set(key, snapshot);
    let nodes = [...this.entries.values()].reduce(
      (n, s) => n + s.nodes.length,
      0,
    );
    while (
      this.entries.size > this.limit ||
      (nodes > this.nodeBudget && this.entries.size > 1)
    ) {
      const first = this.entries.keys().next().value!,
        old = this.entries.get(first)!;
      nodes -= old.nodes.length;
      this.entries.delete(first);
    }
  }
  count(repository: string) {
    return [...this.entries.values()].filter((s) => s.repository === repository)
      .length;
  }
}
export function neighborCommits(commits: Commit[], sha: string) {
  const index = commits.findIndex((c) => c.sha === sha);
  if (index < 0) return [];
  return [index + 1, index - 1, index + 2, index - 2]
    .filter((i) => i >= 0 && i < commits.length)
    .map((i) => commits[i].sha);
}
export type WarmState = "idle" | "warming" | "paused";
export class IdleCommitWarmer {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private controller: AbortController | undefined;
  private version = 0;
  private budgets = new Map<string, { start: number; count: number }>();
  private options: { delayMs: number; gapMs: number; maxPerHour: number };
  constructor(
    options: Partial<{
      delayMs: number;
      gapMs: number;
      maxPerHour: number;
    }> = {},
  ) {
    this.options = { delayMs: 2500, gapMs: 4000, maxPerHour: 6, ...options };
  }
  cancel() {
    this.version++;
    clearTimeout(this.timer);
    this.controller?.abort();
    this.controller = undefined;
  }
  schedule(
    repository: string,
    tasks: string[],
    load: (sha: string, signal: AbortSignal) => Promise<void>,
    status: (state: WarmState) => void,
  ) {
    this.cancel();
    const version = this.version;
    let cursor = 0;
    const budget = this.budgets.get(repository);
    if (!budget || Date.now() - budget.start > 3600000)
      this.budgets.set(repository, { start: Date.now(), count: 0 });
    const tick = async () => {
      if (version !== this.version) return;
      if (cursor >= tasks.length) {
        status("idle");
        return;
      }
      const budget = this.budgets.get(repository)!;
      if (budget.count >= this.options.maxPerHour) {
        status("paused");
        return;
      }
      this.controller = new AbortController();
      const signal = this.controller.signal;
      budget.count++;
      status("warming");
      try {
        await load(tasks[cursor++], signal);
      } catch {
        if (!signal.aborted && version === this.version) status("paused");
        return;
      }
      if (version !== this.version) return;
      status("idle");
      this.timer = setTimeout(tick, this.options.gapMs);
    };
    if (tasks.length) this.timer = setTimeout(tick, this.options.delayMs);
    else status("idle");
  }
}
