import { create } from "zustand";
import type {
  RepoSnapshot,
  Commit,
  SnapshotDiff,
} from "../../../packages/core/src/index";
import {
  createDemoSnapshot,
  demoCommits,
} from "../../../packages/core/src/demo";
import { compareSnapshots } from "../../../packages/core/src/diff";
export type View = "Explore" | "Dependencies" | "Functions" | "Pipelines";
interface State {
  snapshot: RepoSnapshot;
  previousSnapshot: RepoSnapshot | null;
  commits: Commit[];
  selectedId: string | null;
  focus: string | null;
  layout: "cloud" | "layers";
  view: View;
  color: "module" | "complexity" | "language" | "changes";
  metric: "loc" | "bytes";
  paused: boolean;
  lowPower: boolean;
  reducedMotion: boolean;
  playing: boolean;
  filesOpen: boolean;
  inspector: "node" | "health" | null;
  query: string;
  pending: boolean;
  progress: string;
  error: string | null;
  diff: SnapshotDiff | null;
  branch: string;
  cameraRevision: number;
  layerRules: Record<string, string>;
  set: (patch: Partial<State>) => void;
  select: (id: string | null) => void;
  replace: (s: RepoSnapshot, commits?: Commit[]) => void;
}
export const useRepo = create<State>((set, get) => ({
  snapshot: createDemoSnapshot(49),
  previousSnapshot: null,
  commits: demoCommits,
  selectedId: null,
  focus: null,
  layout: "cloud",
  view: "Explore",
  color: "module",
  metric: "loc",
  paused: false,
  lowPower: false,
  reducedMotion:
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  playing: false,
  filesOpen: typeof window === "undefined" || window.innerWidth > 700,
  inspector: null,
  query: "",
  pending: false,
  progress: "",
  error: null,
  diff: null,
  branch: "main",
  cameraRevision: 0,
  layerRules: {},
  set: (patch) => set(patch),
  select: (id) =>
    set({ selectedId: id, inspector: id ? "node" : null, query: "" }),
  replace: (s, commits) => {
    const prev = get().snapshot,
      same = prev.repository === s.repository,
      diff = same ? compareSnapshots(prev, s) : null,
      current = get().selectedId,
      rename = diff?.renamed.find(
        (r) => current === r.from || current?.startsWith(r.from + "#"),
      ),
      selected =
        rename && current
          ? rename.to + current.slice(rename.from.length)
          : current;
    set({
      snapshot: s,
      previousSnapshot: same ? prev : null,
      commits: commits ?? get().commits,
      diff,
      selectedId:
        same && s.nodes.some((n) => n.id === selected) ? selected : null,
      focus: same ? get().focus : null,
      pending: false,
      error: null,
      query: "",
    });
  },
}));
let generation = 0;
export async function json<T>(url: string, init?: RequestInit): Promise<T> {
  if (
    import.meta.env.VITE_ANALYSIS_MODE === "browser" &&
    url.startsWith("/api/")
  ) {
    const { browserRequest } = await import("./browser/api");
    return browserRequest<T>(url, init);
  }
  const res = await fetch(url, init);
  const value = await res.json();
  if (!res.ok)
    throw new Error(value.error ?? `Request failed (${res.status}).`);
  return value;
}
export async function loadRepository(
  repository: string,
  ref?: string,
  branch = "main",
  preserveHistory = false,
) {
  const ticket = ++generation,
    store = useRepo.getState();
  store.set({
    pending: true,
    progress: "Connecting to GitHub…",
    error: null,
    playing: preserveHistory ? store.playing : false,
  });
  try {
    const [job, history] = await Promise.all([
      json<{ id: string }>("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repository,
          ref: ref ?? (branch !== "main" ? branch : undefined),
        }),
      }),
      preserveHistory
        ? Promise.resolve(null)
        : json<{ commits: Commit[]; branch?: string }>(
            `/api/repos/${repository}/commits${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`,
          ),
    ]);
    const deadline = Date.now() + 190000;
    while (Date.now() < deadline) {
      if (ticket !== generation) return;
      const result = await json<{
        status: string;
        progress: string;
        error?: string;
        snapshot?: RepoSnapshot;
      }>(`/api/analyses/${job.id}`);
      if (ticket !== generation) return;
      if (result.status === "error") throw new Error(result.error);
      if (result.snapshot) {
        useRepo.getState().replace(result.snapshot, history?.commits);
        useRepo.getState().set({ branch: history?.branch ?? branch });
        return;
      }
      store.set({ progress: result.progress });
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(
      "Analysis timed out. Retry or choose a smaller repository.",
    );
  } catch (e) {
    if (ticket === generation)
      store.set({
        pending: false,
        error: e instanceof Error ? e.message : "Analysis failed.",
        playing: false,
      });
  }
}
export function loadCommit(sha: string) {
  const s = useRepo.getState();
  if (s.snapshot.demo) {
    const index = [...demoCommits].reverse().findIndex((c) => c.sha === sha);
    s.replace(createDemoSnapshot(index));
    return Promise.resolve();
  }
  return loadRepository(s.snapshot.repository, sha, s.branch, true);
}
export function openDemo() {
  generation++;
  useRepo.getState().replace(createDemoSnapshot(49), demoCommits);
  useRepo.getState().set({
    branch: "main",
    pending: false,
    playing: false,
    error: null,
    inspector: null,
  });
}

export async function loadOlderCommits() {
  const ticket = generation,
    state = useRepo.getState(),
    repository = state.snapshot.repository,
    branch = state.branch;
  try {
    const response = await json<{ commits: Commit[] }>(
      `/api/repos/${repository}/commits?page=${Math.floor(state.commits.length / 50) + 1}&ref=${encodeURIComponent(branch)}`,
    );
    if (
      ticket !== generation ||
      useRepo.getState().snapshot.repository !== repository ||
      useRepo.getState().branch !== branch
    )
      return;
    const current = useRepo.getState().commits;
    state.set({
      commits: [
        ...current,
        ...response.commits.filter(
          (c) => !current.some((p) => p.sha === c.sha),
        ),
      ],
    });
    if (!response.commits.length)
      state.set({ error: "No older commits available." });
  } catch (error) {
    if (
      ticket === generation &&
      useRepo.getState().snapshot.repository === repository
    )
      state.set({ error: (error as Error).message });
  }
}
