import {
  useRepo,
  lenses,
  loadRepository,
  loadCommit,
  compareCommits,
  type Lens,
} from "./state";

/**
 * The address names exactly what is on screen: repository, revision, lens,
 * layout, selection and comparison base. Anyone opening it sees the same view.
 */
export function shareUrl() {
  const s = useRepo.getState(),
    p = new URLSearchParams();
  p.set("repo", s.snapshot.demo ? "demo" : s.snapshot.repository);
  if (s.snapshot.sha && s.snapshot.sha !== "empty")
    p.set("rev", s.snapshot.sha.slice(0, 12));
  if (s.lens !== "architecture") p.set("lens", s.lens);
  if (s.layout !== "cloud") p.set("layout", s.layout);
  if (s.selectedId) p.set("select", s.selectedId);
  if (s.compareBase) p.set("from", s.compareBase.slice(0, 12));
  if (s.focus) p.set("focus", s.focus);
  return `${location.origin}${location.pathname}?${p.toString()}`;
}

export function writeUrl() {
  if (!useRepo.getState().started) return;
  const next = shareUrl();
  if (next !== location.href) history.replaceState(null, "", next);
}

const full = (prefix: string | null) =>
  prefix
    ? (useRepo.getState().commits.find((c) => c.sha.startsWith(prefix))?.sha ??
      prefix)
    : undefined;

/** Restores a shared view. Returns false when the address names no repository. */
export async function readUrl() {
  const p = new URLSearchParams(location.search),
    repo = p.get("repo");
  if (!repo) return false;
  const store = useRepo.getState();
  if (repo !== "demo") {
    await loadRepository(repo, p.get("rev") ?? undefined);
    if (useRepo.getState().error) return true;
  } else {
    const rev = full(p.get("rev"));
    if (rev && rev !== store.snapshot.sha) await loadCommit(rev);
  }
  const lens = p.get("lens") as Lens | null;
  if (lens && lenses.some((l) => l.id === lens))
    useRepo.getState().setLens(lens);
  const layout = p.get("layout");
  if (layout === "layers" || layout === "plan")
    useRepo.getState().set({ layout });
  const from = full(p.get("from"));
  if (from) await compareCommits(from, useRepo.getState().snapshot.sha);
  const focus = p.get("focus");
  if (focus && useRepo.getState().snapshot.nodes.some((n) => n.group === focus))
    useRepo.getState().set({ focus });
  const select = p.get("select");
  if (select && useRepo.getState().snapshot.nodes.some((n) => n.id === select))
    useRepo.getState().locate(select);
  return true;
}
