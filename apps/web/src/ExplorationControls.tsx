import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Eye,
  Focus,
  GitBranch,
  Layers3,
  LoaderCircle,
  X,
} from "lucide-react";
import { json, loadRepository, useRepo } from "./state";
import { publicGithub, type Quota } from "./browser/github-client";

export function BranchSwitcher() {
  const { snapshot, branch, pending } = useRepo();
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [branches, setBranches] = useState<string[]>([]),
    [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const ticket = useRef(0),
    container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ticket.current++;
    setOpen(false);
    setBranches([]);
    setPage(1);
    setError("");
  }, [snapshot.repository, snapshot.demo]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  async function list(next = 1) {
    const id = ++ticket.current;
    setBusy(true);
    setError("");
    try {
      const result = await json<{ branches: string[]; hasMore: boolean }>(
        `/api/repos/${snapshot.repository}/branches?page=${next}`,
      );
      if (id !== ticket.current) return;
      setBranches((old) =>
        next === 1
          ? result.branches
          : [...new Set([...old, ...result.branches])],
      );
      setHasMore(result.hasMore);
      setPage(next);
    } catch (e) {
      if (id === ticket.current)
        setError(
          e instanceof Error
            ? e.message
            : "Branches unavailable. Enter a branch name to retry.",
        );
    } finally {
      if (id === ticket.current) setBusy(false);
    }
  }
  function toggle() {
    const next = !open;
    setOpen(next);
    setQuery("");
    if (next && !snapshot.demo && !branches.length) void list();
  }
  function choose(name: string) {
    if (!name.trim()) return;
    setOpen(false);
    void loadRepository(snapshot.repository, name.trim(), name.trim());
  }
  const filtered = (snapshot.demo ? [branch] : branches).filter((b) =>
    b.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div
      className="branch-switcher"
      ref={container}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          setOpen(false);
          container.current?.querySelector("button")?.focus();
        }
      }}
    >
      <button
        className="branch-indicator"
        aria-label="Switch branch"
        aria-expanded={open}
        onClick={toggle}
      >
        <GitBranch size={14} />
        <span>{branch}</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <section className="control-popover branch-menu" aria-label="Branches">
          <div className="control-popover-heading">
            <b>Switch branch</b>
            <button
              className="icon-button"
              aria-label="Close branches"
              onClick={() => setOpen(false)}
            >
              <X size={15} />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!snapshot.demo) choose(query);
            }}
          >
            <input
              type="search"
              aria-label="Find or enter branch"
              placeholder="Find or enter branch…"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
          {snapshot.demo && <p>Demo has one illustrative branch.</p>}
          {busy && (
            <p role="status">
              <LoaderCircle size={14} /> Loading branches…
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <div className="branch-list scroll-area">
            {filtered.map((b) => (
              <button
                key={b}
                aria-current={b === branch ? "true" : undefined}
                disabled={snapshot.demo || (pending && b === branch)}
                onClick={() => choose(b)}
              >
                <GitBranch size={14} />
                <span>{b}</span>
                {b === branch && <small>current</small>}
              </button>
            ))}
          </div>
          {!snapshot.demo &&
            query.trim() &&
            !branches.includes(query.trim()) && (
              <button className="branch-enter" onClick={() => choose(query)}>
                Open “{query.trim()}”
              </button>
            )}
          {!snapshot.demo && hasMore && (
            <button
              className="branch-enter"
              disabled={busy}
              onClick={() => void list(page + 1)}
            >
              Load more branches
            </button>
          )}
          {!snapshot.demo && error && (
            <button
              className="branch-enter"
              disabled={busy}
              onClick={() => void list()}
            >
              Retry branch list
            </button>
          )}
        </section>
      )}
    </div>
  );
}

export function GroupVisibility() {
  const { snapshot, hiddenGroups, isolateFocus, focus, set } = useRepo(),
    [open, setOpen] = useState(false),
    container = useRef<HTMLDivElement>(null);
  const groups = snapshot.nodes
    .filter((n) => n.kind === "package")
    .map((n) => n.group);
  const hidden = (g: string) =>
    hiddenGroups.includes(g) || (isolateFocus && !!focus && focus !== g);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  function toggle(g: string) {
    const current = groups.filter(hidden),
      next = hidden(g) ? current.filter((v) => v !== g) : [...current, g];
    set({
      hiddenGroups: next,
      isolateFocus: false,
      ...(next.includes(focus ?? "") ? { focus: null } : {}),
      selectedId: null,
    });
  }
  return (
    <div
      className="group-visibility"
      ref={container}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          setOpen(false);
          container.current?.querySelector("button")?.focus();
        }
      }}
    >
      <button
        className={`visibility-button ${groups.some(hidden) ? "active" : ""}`}
        aria-label="Group visibility"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Layers3 size={16} />
        <span>
          Groups
          {groups.some(hidden)
            ? ` · ${groups.filter((g) => !hidden(g)).length}/${groups.length}`
            : ""}
        </span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <section
          className="control-popover group-menu"
          aria-label="Group visibility controls"
        >
          <div className="control-popover-heading">
            <b>Groups / layers</b>
            <button
              className="icon-button"
              aria-label="Close group visibility"
              onClick={() => setOpen(false)}
            >
              <X size={15} />
            </button>
          </div>
          <p>Focus a group, or show only the layers you need.</p>
          <div className="visibility-list scroll-area">
            {groups.map((g) => (
              <div className="visibility-row" key={g}>
                <label>
                  <input
                    type="checkbox"
                    aria-label={`Show ${g}`}
                    checked={!hidden(g)}
                    onChange={() => toggle(g)}
                  />
                  <span>{g}</span>
                </label>
                <button
                  className="icon-button"
                  aria-label={`Focus group ${g}`}
                  aria-pressed={focus === g}
                  onClick={() => useRepo.getState().focusGroup(g)}
                >
                  <Focus size={15} />
                </button>
                <button
                  aria-label={`Only ${g}`}
                  onClick={() =>
                    set({
                      hiddenGroups: groups.filter((v) => v !== g),
                      isolateFocus: false,
                      focus: g,
                      selectedId: null,
                    })
                  }
                >
                  Only
                </button>
              </div>
            ))}
          </div>
          {focus && (
            <label className="isolate-choice">
              <input
                type="checkbox"
                checked={isolateFocus}
                onChange={(e) => set({ isolateFocus: e.target.checked })}
              />
              Hide groups outside focus
            </label>
          )}
          <button
            className="show-all-groups"
            onClick={() =>
              set({ hiddenGroups: [], isolateFocus: false, focus: null })
            }
          >
            <Eye size={15} />
            Show all groups
          </button>
        </section>
      )}
    </div>
  );
}

export function ApiAllowance() {
  const [quota, setQuota] = useState<Quota>(publicGithub.quota),
    [now, setNow] = useState(Date.now());
  useEffect(() => {
    const change = (event: Event) =>
      setQuota((event as CustomEvent<Quota>).detail);
    window.addEventListener("repo-view:quota", change);
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      window.removeEventListener("repo-view:quota", change);
      clearInterval(timer);
    };
  }, []);
  if (
    import.meta.env.VITE_ANALYSIS_MODE !== "browser" ||
    quota.remaining === undefined ||
    (quota.resetAt && now >= quota.resetAt)
  )
    return null;
  return (
    <span
      className={`api-allowance ${quota.remaining <= 20 ? "low" : ""}`}
      role="status"
      title={`Public GitHub API requests remaining${quota.resetAt ? "; resets at " + new Date(quota.resetAt).toLocaleTimeString() : ""}. Cached commits remain available; background caching pauses at 20 requests.`}
    >
      {quota.remaining} API left
      {quota.resetAt && quota.remaining <= 20
        ? ` · resets ${new Date(quota.resetAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : ""}
    </span>
  );
}
