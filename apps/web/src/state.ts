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
import {
  SnapshotMemory,
  IdleCommitWarmer,
  neighborCommits,
  type WarmState,
} from "./history-cache";
import { cachedSnapshot, cacheSnapshot } from "./browser/cache";
import { fileHistory, type History } from "../../../packages/core/src/insights";
import type { Theme } from "./colors";
export type View = "Explore" | "Dependencies" | "Functions" | "Pipelines";
export type Lens =
  | "architecture"
  | "hotspots"
  | "dependencies"
  | "evolution"
  | "pipelines"
  | "authors";
export type ColorMode =
  | "module"
  | "complexity"
  | "language"
  | "changes"
  | "hotspots"
  | "authors";
export const lenses: { id: Lens; name: string; question: string }[] = [
  {
    id: "architecture",
    name: "Architecture",
    question: "How is it organized?",
  },
  { id: "hotspots", name: "Hotspots", question: "Where is the risk?" },
  {
    id: "dependencies",
    name: "Dependencies",
    question: "What relies on what?",
  },
  { id: "evolution", name: "Evolution", question: "What changed, when?" },
  { id: "pipelines", name: "Pipelines", question: "How does it ship?" },
  { id: "authors", name: "Authors", question: "Who works where?" },
];
const lensColor: Partial<Record<Lens, ColorMode>> = {
  hotspots: "hotspots",
  evolution: "changes",
  authors: "authors",
  dependencies: "module",
};
export type CameraAction = "in" | "out" | "fit" | "locate";
interface PanelState {
  filesOpen: boolean;
  inspectorOpen: boolean;
  historyOpen: boolean;
  ciOpen: boolean;
}
interface State extends PanelState {
  snapshot: RepoSnapshot;
  previousSnapshot: RepoSnapshot | null;
  commits: Commit[];
  selectedId: string | null;
  focus: string | null;
  hiddenGroups: string[];
  isolateFocus: boolean;
  layout: "cloud" | "layers";
  view: View;
  color: ColorMode;
  lens: Lens;
  architectureColor: "module" | "complexity" | "language";
  theme: Theme;
  compareBase: string | null;
  diffBase: string | null;
  history: History | null;
  historyRepository: string;
  started: boolean;
  toast: string | null;
  metric: "loc" | "bytes";
  paused: boolean;
  lowPower: boolean;
  reducedMotion: boolean;
  playing: boolean;
  inspector: "node" | "health" | null;
  query: string;
  pending: boolean;
  progress: string;
  error: string | null;
  diff: SnapshotDiff | null;
  branch: string;
  cameraRevision: number;
  layerRules: Record<string, string>;
  expanded: boolean;
  panelRestore: PanelState | null;
  viewPanelRestore: PanelState | null;
  cameraCommand: { action: CameraAction; revision: number; nodeId?: string };
  graphLevel: "packages" | "files" | "functions";
  cachedCommits: number;
  cacheStatus: WarmState;
  prefetchEnabled: boolean;
  snapshotSource: "analysis" | "cache";
  set: (patch: Partial<State>) => void;
  select: (id: string | null) => void;
  replace: (s: RepoSnapshot, commits?: Commit[]) => void;
  toggleFiles: () => void;
  toggleInspector: () => void;
  toggleView: (view: View) => void;
  toggleExpanded: (value?: boolean) => void;
  requestCamera: (action: CameraAction, nodeId?: string) => void;
  locate: (id: string) => void;
  focusGroup: (group: string) => void;
  setLens: (lens: Lens) => void;
}
function stored(key: string) {
  try {
    return typeof localStorage === "undefined"
      ? null
      : localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Storage is a convenience; the app works without it. */
  }
}
const initialTheme: Theme =
  stored("repo-view:theme") === "whiteprint" ||
  (stored("repo-view:theme") === null &&
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-color-scheme: light)").matches)
    ? "whiteprint"
    : "cyanotype";
const narrow = () => typeof innerWidth !== "undefined" && innerWidth < 1200;
const initial = createDemoSnapshot(49),
  memory = new SnapshotMemory(),
  warmer = new IdleCommitWarmer();
memory.put(initial);
const saveData =
  typeof navigator !== "undefined" &&
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    ?.saveData;
export const useRepo = create<State>((set, get) => ({
  snapshot: initial,
  previousSnapshot: null,
  commits: demoCommits,
  selectedId: null,
  focus: null,
  hiddenGroups: [],
  isolateFocus: false,
  layout: "cloud",
  view: "Explore",
  color: "module",
  lens: "architecture",
  architectureColor: "module",
  theme: initialTheme,
  compareBase: null,
  diffBase: null,
  history: null,
  historyRepository: "",
  started:
    stored("repo-view:started") === "1" ||
    (typeof location !== "undefined" &&
      new URLSearchParams(location.search).has("repo")),
  toast: null,
  metric: "loc",
  paused: false,
  lowPower: false,
  reducedMotion:
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  playing: false,
  filesOpen: false,
  inspectorOpen: false,
  historyOpen: true,
  ciOpen: false,
  inspector: null,
  query: "",
  pending: false,
  progress: "",
  error: null,
  diff: null,
  branch: "main",
  cameraRevision: 0,
  layerRules: {},
  expanded: false,
  panelRestore: null,
  viewPanelRestore: null,
  cameraCommand: { action: "fit", revision: 0 },
  graphLevel: "files",
  cachedCommits: 1,
  cacheStatus: "idle",
  prefetchEnabled: !saveData,
  snapshotSource: "analysis",
  set: (patch) => set(patch),
  setLens: (lens) => {
    const current = get();
    if (lens === "pipelines") {
      set({ lens });
      if (current.view !== "Pipelines") current.toggleView("Pipelines");
      return;
    }
    if (current.view !== "Explore") current.toggleView("Explore");
    set({
      lens,
      color: lensColor[lens] ?? current.architectureColor,
    });
    if (lens === "hotspots" || lens === "authors" || lens === "evolution")
      void refreshHistory();
    if (lens === "evolution") void diffWithParent();
  },
  select: (id) => {
    const node = get().snapshot.nodes.find((n) => n.id === id);
    set({
      ...(node
        ? {
            hiddenGroups: get().hiddenGroups.filter((g) => g !== node.group),
            ...(get().isolateFocus && get().focus !== node.group
              ? { focus: null, isolateFocus: false }
              : {}),
          }
        : {}),
      selectedId: id,
      inspector: id ? "node" : null,
      inspectorOpen: !!id,
      query: "",
      ...(id && narrow() ? { filesOpen: false } : {}),
    });
  },
  focusGroup: (group) =>
    set({
      focus: get().focus === group ? null : group,
      selectedId: null,
      hiddenGroups: get().hiddenGroups.filter((g) => g !== group),
    }),
  toggleFiles: () =>
    set({
      filesOpen: !get().filesOpen,
      ...(!get().filesOpen && narrow() ? { inspectorOpen: false } : {}),
    }),
  toggleInspector: () =>
    set({
      inspectorOpen: !get().inspectorOpen,
      ...(!get().inspectorOpen && narrow() ? { filesOpen: false } : {}),
    }),
  toggleView: (view) => {
    if (get().expanded) get().toggleExpanded(false);
    const current = get(),
      next = current.view === view ? "Explore" : view;
    if (next !== "Explore" && current.view === "Explore") {
      const { filesOpen, inspectorOpen, historyOpen, ciOpen } = current;
      set({
        view: next,
        viewPanelRestore: { filesOpen, inspectorOpen, historyOpen, ciOpen },
        filesOpen: false,
        inspectorOpen: false,
        query: "",
      });
    } else if (next === "Explore")
      set({
        view: next,
        ...(current.lens === "pipelines"
          ? { lens: "architecture", color: current.architectureColor }
          : {}),
        ...current.viewPanelRestore,
        viewPanelRestore: null,
        query: "",
      });
    else set({ view: next, query: "" });
  },
  toggleExpanded: (value) => {
    const next = value ?? !get().expanded;
    if (next === get().expanded) return;
    if (next) {
      const { filesOpen, inspectorOpen, historyOpen, ciOpen } = get();
      set({
        expanded: true,
        panelRestore: { filesOpen, inspectorOpen, historyOpen, ciOpen },
        filesOpen: false,
        inspectorOpen: false,
        historyOpen: false,
        ciOpen: false,
        view: "Explore",
        playing: false,
      });
    } else set({ expanded: false, ...get().panelRestore, panelRestore: null });
  },
  requestCamera: (action, nodeId) =>
    set({
      cameraCommand: {
        action,
        nodeId,
        revision: get().cameraCommand.revision + 1,
      },
    }),
  locate: (id) => {
    if (get().view !== "Explore") get().toggleView("Explore");
    get().select(id);
    get().requestCamera("locate", id);
  },
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
    memory.put(s);
    set({
      snapshot: s,
      previousSnapshot: same ? prev : null,
      commits: commits ?? get().commits,
      diff,
      diffBase: same ? prev.sha : null,
      compareBase: null,
      selectedId:
        same && s.nodes.some((n) => n.id === selected) ? selected : null,
      focus:
        same && s.nodes.some((n) => n.group === get().focus)
          ? get().focus
          : null,
      hiddenGroups: same
        ? get().hiddenGroups.filter((g) => s.nodes.some((n) => n.group === g))
        : [],
      isolateFocus:
        same && s.nodes.some((n) => n.group === get().focus)
          ? get().isolateFocus
          : false,
      pending: false,
      error: null,
      query: "",
      cachedCommits: memory.count(s.repository),
    });
  },
}));
let generation = 0;
let foreground: AbortController | undefined;
export async function json<T>(url: string, init?: RequestInit): Promise<T> {
  if (
    import.meta.env.VITE_ANALYSIS_MODE === "browser" &&
    url.startsWith("/api/")
  ) {
    const { browserRequest } = await import("./browser/api");
    return browserRequest<T>(url, init);
  }
  const res = await fetch(url, init),
    value = await res.json();
  if (!res.ok)
    throw new Error(value.error ?? `Request failed (${res.status}).`);
  return value;
}
function pause(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Cancelled", "AbortError"));
      return;
    }
    const done = () => {
        signal?.removeEventListener("abort", abort);
        resolve();
      },
      timer = setTimeout(done, ms),
      abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Cancelled", "AbortError"));
      };
    signal?.addEventListener("abort", abort, { once: true });
  });
}
async function requestSnapshot(
  repository: string,
  ref: string | undefined,
  signal?: AbortSignal,
  background = false,
  onProgress?: (p: string) => void,
) {
  const job = await json<{ id: string }>("/api/analyses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repository,
      ref,
      priority: background ? "background" : "foreground",
    }),
  });
  const cancel = () => {
    if (import.meta.env.VITE_ANALYSIS_MODE === "browser")
      void json(`/api/analyses/${job.id}`, { method: "DELETE" }).catch(
        () => {},
      );
  };
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    const deadline = Date.now() + 190000;
    while (Date.now() < deadline) {
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      const result = await json<{
        status: string;
        progress: string;
        error?: string;
        snapshot?: RepoSnapshot;
      }>(`/api/analyses/${job.id}`);
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      if (result.status === "error") throw new Error(result.error);
      if (result.snapshot) return result.snapshot;
      onProgress?.(result.progress);
      await pause(background ? 900 : 250, signal);
    }
    throw new Error(
      "Analysis timed out. Retry or choose a smaller repository.",
    );
  } finally {
    signal?.removeEventListener("abort", cancel);
    if (signal?.aborted) cancel();
  }
}
async function remember(s: RepoSnapshot) {
  memory.put(s);
  await cacheSnapshot(s);
}
export function scheduleWarmup() {
  const s = useRepo.getState();
  warmer.cancel();
  if (
    s.snapshot.demo ||
    !s.prefetchEnabled ||
    s.pending ||
    s.playing ||
    (typeof document !== "undefined" && document.hidden)
  ) {
    s.set({ cacheStatus: "idle" });
    return;
  }
  const ticket = generation,
    repository = s.snapshot.repository,
    targets = neighborCommits(s.commits, s.snapshot.sha).filter(
      (sha) => !memory.get(repository, sha),
    );
  warmer.schedule(
    repository,
    targets,
    async (sha, signal) => {
      if (signal.aborted || ticket !== generation || useRepo.getState().pending)
        throw new DOMException("Cancelled", "AbortError");
      let value = await cachedSnapshot(repository, sha);
      if (!value) {
        if (s.snapshot.demo) {
          const i = [...demoCommits].reverse().findIndex((c) => c.sha === sha);
          value = createDemoSnapshot(i);
        } else value = await requestSnapshot(repository, sha, signal, true);
      }
      if (signal.aborted || ticket !== generation) return;
      await remember(value);
      if (ticket === generation)
        s.set({ cachedCommits: memory.count(repository) });
    },
    (cacheStatus) => {
      if (ticket === generation) s.set({ cacheStatus });
    },
  );
}
export function stopWarmup() {
  warmer.cancel();
  useRepo.getState().set({ cacheStatus: "idle" });
}
export async function loadRepository(
  repository: string,
  ref?: string,
  branch = "main",
  preserveHistory = false,
) {
  foreground?.abort();
  foreground = new AbortController();
  const signal = foreground.signal;
  const ticket = ++generation,
    store = useRepo.getState();
  stopWarmup();
  store.set({
    pending: true,
    progress: "Checking snapshot cache…",
    error: null,
    playing: preserveHistory ? store.playing : false,
  });
  try {
    if (preserveHistory && ref) {
      const cached =
        memory.get(repository, ref) ?? (await cachedSnapshot(repository, ref));
      if (ticket !== generation) return;
      if (cached) {
        store.replace(cached);
        store.set({ snapshotSource: "cache" });
        return;
      }
    }
    store.set({ progress: "Connecting to GitHub…" });
    const [snapshot, history] = await Promise.all([
      requestSnapshot(
        repository,
        ref ?? (branch !== "main" ? branch : undefined),
        signal,
        false,
        (progress) => {
          if (ticket === generation) store.set({ progress });
        },
      ),
      preserveHistory
        ? Promise.resolve(null)
        : json<{ commits: Commit[]; branch?: string }>(
            `/api/repos/${repository}/commits${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`,
          ),
    ]);
    if (ticket !== generation) return;
    store.replace(snapshot, history?.commits);
    store.set({
      branch: history?.branch ?? branch,
      snapshotSource: "analysis",
    });
    void remember(snapshot);
  } catch (e) {
    if (ticket === generation)
      store.set({
        pending: false,
        error: e instanceof Error ? e.message : "Analysis failed.",
        playing: false,
      });
  }
}
export async function loadCommit(sha: string) {
  const s = useRepo.getState();
  if (sha === s.snapshot.sha) {
    if (s.pending) {
      generation++;
      foreground?.abort();
      stopWarmup();
      s.set({ pending: false, playing: false, error: null, progress: "" });
    }
    return;
  }
  if (s.snapshot.demo) {
    ++generation;
    stopWarmup();
    const cached = memory.get(s.snapshot.repository, sha),
      index = [...demoCommits].reverse().findIndex((c) => c.sha === sha);
    s.replace(cached ?? createDemoSnapshot(index));
    s.set({ snapshotSource: cached ? "cache" : "analysis" });
    return;
  }
  return loadRepository(s.snapshot.repository, sha, s.branch, true);
}
export function openDemo() {
  foreground?.abort();
  generation++;
  stopWarmup();
  if (import.meta.env.VITE_ANALYSIS_MODE === "browser") {
    const ticket = generation;
    void import("./browser/api").then((m) => {
      if (ticket === generation) m.cancelBrowserAnalyses();
    });
  }
  useRepo.getState().replace(initial, demoCommits);
  useRepo.getState().set({
    branch: "main",
    pending: false,
    playing: false,
    error: null,
    inspector: null,
    inspectorOpen: false,
    snapshotSource: "cache",
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
  } catch (e) {
    if (
      ticket === generation &&
      useRepo.getState().snapshot.repository === repository
    )
      state.set({ error: (e as Error).message });
  }
}

const demoSnapshots = new Map<string, RepoSnapshot>();
function demoSnapshot(sha: string) {
  let value = demoSnapshots.get(sha) ?? memory.get(initial.repository, sha);
  if (!value) {
    const index = [...demoCommits].reverse().findIndex((c) => c.sha === sha);
    if (index < 0) return undefined;
    value = createDemoSnapshot(index);
  }
  demoSnapshots.set(sha, value);
  return value;
}
/** Returns a snapshot without displaying it: memory, then browser cache, then analysis. */
export async function getSnapshot(
  repository: string,
  sha: string,
  signal?: AbortSignal,
): Promise<RepoSnapshot> {
  const s = useRepo.getState();
  if (s.snapshot.demo && repository === s.snapshot.repository) {
    const value = demoSnapshot(sha);
    if (value) return value;
  }
  const known =
    memory.get(repository, sha) ?? (await cachedSnapshot(repository, sha));
  if (known) return known;
  const value = await requestSnapshot(repository, sha, signal);
  await remember(value);
  return value;
}
let historyTicket = 0;
/** Rebuilds change counts and last authors from every snapshot that is already known. Never downloads. */
export async function refreshHistory() {
  const ticket = ++historyTicket,
    s = useRepo.getState(),
    repository = s.snapshot.repository,
    found = new Map<string, RepoSnapshot>();
  for (const c of s.commits) {
    const value = s.snapshot.demo
      ? demoSnapshot(c.sha)
      : c.sha === s.snapshot.sha
        ? s.snapshot
        : (memory.get(repository, c.sha) ??
          (await cachedSnapshot(repository, c.sha).catch(() => undefined)));
    if (value) found.set(c.sha, value);
    if (ticket !== historyTicket) return;
  }
  if (ticket !== historyTicket) return;
  useRepo.getState().set({
    history: fileHistory(s.commits, (sha) => found.get(sha)),
    historyRepository: repository,
  });
}
/** Displays `to` and marks every difference from `from`. Both snapshots load atomically before anything changes. */
export async function compareCommits(from: string, to: string) {
  const s = useRepo.getState(),
    repository = s.snapshot.repository,
    order = (sha: string) => s.commits.findIndex((c) => c.sha === sha);
  if (from === to) return;
  if (order(from) < order(to)) [from, to] = [to, from];
  s.set({ playing: false, pending: true, progress: "Loading base revision…" });
  try {
    const base = await getSnapshot(repository, from);
    if (useRepo.getState().snapshot.repository !== repository) return;
    if (useRepo.getState().snapshot.sha !== to) {
      useRepo.getState().set({ progress: "Loading compared revision…" });
      await loadCommit(to);
    }
    const now = useRepo.getState();
    if (now.snapshot.sha !== to) return;
    now.set({
      previousSnapshot: base,
      diff: compareSnapshots(base, now.snapshot),
      diffBase: from,
      compareBase: from,
      pending: false,
      lens: "evolution",
      color: "changes",
    });
    if (now.view !== "Explore") now.toggleView("Explore");
    void refreshHistory();
  } catch (e) {
    useRepo.getState().set({
      pending: false,
      error: e instanceof Error ? e.message : "Comparison failed.",
    });
  }
}
export function clearCompare() {
  useRepo.getState().set({
    compareBase: null,
    diff: null,
    diffBase: null,
    previousSnapshot: null,
  });
}

/**
 * Evolution reads best against the parent commit. Uses only snapshots that are
 * already known (demo, memory or browser cache) and never starts a download.
 */
export async function diffWithParent() {
  const s = useRepo.getState();
  if (s.compareBase) return;
  const i = s.commits.findIndex((c) => c.sha === s.snapshot.sha),
    parent = s.commits[i + 1];
  if (i < 0 || !parent || s.diffBase === parent.sha) return;
  const repository = s.snapshot.repository,
    sha = s.snapshot.sha,
    base = s.snapshot.demo
      ? demoSnapshot(parent.sha)
      : (memory.get(repository, parent.sha) ??
        (await cachedSnapshot(repository, parent.sha).catch(() => undefined)));
  const now = useRepo.getState();
  if (!base || now.snapshot.sha !== sha || now.compareBase) return;
  now.set({
    previousSnapshot: base,
    diff: compareSnapshots(base, now.snapshot),
    diffBase: parent.sha,
  });
}
