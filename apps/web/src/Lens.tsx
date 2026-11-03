import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FolderTree,
  ListTree,
  Network,
  Layers3,
  LayoutDashboard,
  X,
} from "lucide-react";
import { useRepo, lenses, clearCompare, type Lens } from "./state";
import { GroupVisibility } from "./ExplorationControls";
import { authorColor, groupColor, inks } from "./colors";
import { impactOf } from "../../../packages/core/src/impact";
import {
  authorship,
  hotspots,
  type Hotspot,
} from "../../../packages/core/src/insights";

const compact = (n: number) =>
  Intl.NumberFormat("en", {
    notation: n > 9999 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);

export function LensBar() {
  const { lens, setLens, layout, set, view, filesOpen, toggleFiles } =
    useRepo();
  const strip = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    strip.current
      ?.querySelector<HTMLElement>(".lens.active")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [lens]);
  return (
    <div className="lens-bar">
      <button
        className={`files-toggle ${filesOpen ? "active" : ""}`}
        aria-label="Toggle files"
        aria-expanded={filesOpen}
        onClick={toggleFiles}
      >
        <ListTree size={17} strokeWidth={1.6} />
        <span>Files</span>
      </button>
      <nav
        className="lenses"
        aria-label="Lenses"
        data-hint="lenses"
        ref={strip}
      >
        {lenses.map((l, i) => (
          <button
            key={l.id}
            className={`lens ${lens === l.id ? "active" : ""}`}
            aria-label={l.name}
            aria-pressed={lens === l.id}
            title={`${l.question} (${i + 1})`}
            onClick={() => setLens(l.id)}
          >
            <b>{l.name}</b>
            <small>{l.question}</small>
          </button>
        ))}
      </nav>
      {view === "Explore" && (
        <div className="lens-tools">
          <GroupVisibility />
          <div className="segmented morph" aria-label="Spatial layout">
            <button
              aria-pressed={layout === "cloud"}
              className={layout === "cloud" ? "active" : ""}
              onClick={() => set({ layout: "cloud" })}
            >
              <Network size={15} strokeWidth={1.6} />
              Cloud
            </button>
            <button
              aria-pressed={layout === "layers"}
              className={layout === "layers" ? "active" : ""}
              onClick={() => set({ layout: "layers" })}
            >
              <Layers3 size={15} strokeWidth={1.6} />
              Layers
            </button>
            <button
              aria-pressed={layout === "plan"}
              className={layout === "plan" ? "active" : ""}
              title="Floor plan: nested rooms sized by lines of code, names never overlap"
              onClick={() => set({ layout: "plan" })}
            >
              <LayoutDashboard size={15} strokeWidth={1.6} />
              Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Scope() {
  const { snapshot, focus, compareBase, lens } = useRepo(),
    name = lenses.find((l) => l.id === lens)?.name;
  return (
    <p className="lens-scope">
      <span>{name}</span>
      <span>{snapshot.repository.split("/")[1]}</span>
      {focus && <span>{focus}</span>}
      <span className="mono">
        {compareBase
          ? `${compareBase.slice(0, 7)} → ${snapshot.sha.slice(0, 7)}`
          : `rev ${snapshot.sha.slice(0, 7)}`}
      </span>
    </p>
  );
}

function HistoryNote({ what }: { what: string }) {
  const history = useRepo((s) => s.history);
  if (!history) return <p className="lens-note">Reading opened commits…</p>;
  const { compared, total } = history.coverage;
  return (
    <p className="lens-note">
      {what} from {compared} of {total} commit pairs.{" "}
      {compared < total &&
        "Only commits already opened or cached are compared; nothing is downloaded for this lens."}
    </p>
  );
}

function Architecture() {
  const { snapshot, architectureColor, set, select, theme } = useRepo(),
    groups = snapshot.nodes.filter((n) => n.kind === "package"),
    names = groups.map((g) => g.group),
    files = snapshot.nodes.filter((n) => n.kind === "file"),
    functions = snapshot.nodes.filter((n) => n.kind === "function").length,
    ink = inks[theme];
  return (
    <>
      <p className="lens-lead">
        {groups.length} groups · {compact(files.length)} files ·{" "}
        {compact(files.reduce((s, n) => s + n.loc, 0))} lines ·{" "}
        {compact(functions)} functions
      </p>
      <div className="segmented small" aria-label="Colour by">
        {(
          [
            ["module", "Group"],
            ["language", "Language"],
            ["complexity", "Complexity"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            aria-pressed={architectureColor === id}
            className={architectureColor === id ? "active" : ""}
            onClick={() => set({ architectureColor: id, color: id })}
          >
            {label}
          </button>
        ))}
      </div>
      {architectureColor === "module" ? (
        <div className="legend-list">
          {groups.map((g) => (
            <button key={g.id} onClick={() => select(g.id)}>
              <i style={{ background: groupColor(g.group, names, theme) }} />
              <span>{g.group}</span>
              <small>
                {files.filter((f) => f.group === g.group).length} files
              </small>
            </button>
          ))}
        </div>
      ) : architectureColor === "language" ? (
        <div className="legend-list static">
          {(["TypeScript", "JavaScript", "other"] as const).map((l) => (
            <span key={l}>
              <i style={{ background: ink.language[l] }} />
              <span>{l === "other" ? "Other languages" : l}</span>
              <small>
                {
                  files.filter((f) =>
                    l === "other"
                      ? f.language !== "TypeScript" &&
                        f.language !== "JavaScript"
                      : f.language === l,
                  ).length
                }{" "}
                files
              </small>
            </span>
          ))}
        </div>
      ) : (
        <div className="legend-list static">
          <span>
            <i style={{ background: ink.muted }} />
            <span>Simple</span>
            <small>≤ 5 branches</small>
          </span>
          <span>
            <i style={{ background: ink.ink }} />
            <span>Moderate</span>
            <small>6–10</small>
          </span>
          <span>
            <i style={{ background: ink.revision }} />
            <span>Complex</span>
            <small>&gt; 10 branches per function</small>
          </span>
        </div>
      )}
      <p className="lens-note">
        Size follows{" "}
        {useRepo.getState().metric === "loc" ? "lines of code" : "bytes"}.{" "}
        {snapshot.coverage.partial
          ? `Partial analysis: ${snapshot.coverage.skipped} files skipped.`
          : `${Math.round(snapshot.coverage.total ? (snapshot.coverage.analyzed / snapshot.coverage.total) * 100 : 0)}% text coverage.`}
      </p>
    </>
  );
}

/** Rows slide to their new rank and stay marked until the visitor has looked at them. */
function RankedList({ items }: { items: Hotspot[] }) {
  const { select, selectedId, reducedMotion, theme } = useRepo(),
    refs = useRef(new Map<string, HTMLButtonElement>()),
    previous = useRef(new Map<string, { top: number; rank: number }>()),
    [moved, setMoved] = useState<Set<string>>(new Set()),
    ink = inks[theme];
  useLayoutEffect(() => {
    const next = new Map<string, { top: number; rank: number }>(),
      changed = new Set<string>();
    items.forEach((h, rank) => {
      const el = refs.current.get(h.node.id);
      if (!el) return;
      const top = el.getBoundingClientRect().top,
        before = previous.current.get(h.node.id);
      next.set(h.node.id, { top, rank });
      if (before && before.rank !== rank) {
        changed.add(h.node.id);
        if (!reducedMotion)
          el.animate(
            [
              { transform: `translateY(${before.top - top}px)` },
              { transform: "translateY(0)" },
            ],
            { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" },
          );
      } else if (!before && previous.current.size) changed.add(h.node.id);
    });
    previous.current = next;
    if (changed.size) setMoved((m) => new Set([...m, ...changed]));
  }, [items]);
  const seen = (id: string) =>
    moved.has(id) &&
    setMoved((m) => {
      const n = new Set(m);
      n.delete(id);
      return n;
    });
  return (
    <ol className="ranked">
      {items.map((h) => (
        <li key={h.node.id}>
          <button
            ref={(el) => {
              if (el) refs.current.set(h.node.id, el);
              else refs.current.delete(h.node.id);
            }}
            className={`${selectedId === h.node.id ? "selected" : ""} ${moved.has(h.node.id) ? "moved" : ""}`}
            onPointerEnter={() => seen(h.node.id)}
            onFocus={() => seen(h.node.id)}
            onClick={() => select(h.node.id)}
            title={h.node.path}
          >
            <span className="path">{h.node.path}</span>
            <b>{h.score}</b>
            <span className="bar">
              <i
                style={{
                  width: `${h.score}%`,
                  background: h.score > 55 ? ink.revision : ink.ink,
                }}
              />
            </span>
            <small>
              {h.changes} changes · complexity {h.complexity}
            </small>
          </button>
        </li>
      ))}
    </ol>
  );
}

function Hotspots() {
  const { snapshot, history, theme } = useRepo(),
    result = useMemo(
      () =>
        history
          ? hotspots(snapshot, history)
          : { mode: "complexity-only" as const, items: [] },
      [snapshot, history],
    ),
    ink = inks[theme];
  return (
    <>
      <p className="lens-lead">
        {result.mode === "churn-complexity" ? (
          <>
            Files that change often <b>and</b> are complex.
          </>
        ) : (
          <>
            Most complex files. Open more commits to weigh in change frequency.
          </>
        )}
      </p>
      <div className="ramp" aria-hidden="true">
        <i style={{ background: ink.muted }} />
        <span
          style={{
            background: `linear-gradient(90deg, ${ink.muted}, ${ink.ink}, ${ink.revision})`,
          }}
        />
        <i style={{ background: ink.revision }} />
      </div>
      <p className="lens-legend">
        Point size and colour = score · score ={" "}
        {result.mode === "churn-complexity"
          ? "changes × summed branch complexity"
          : "summed branch complexity"}
      </p>
      {result.items.length ? (
        <RankedList items={result.items.slice(0, 8)} />
      ) : (
        <p className="lens-empty">
          No analyzed JavaScript or TypeScript functions in this snapshot, so
          there is nothing to rank.
        </p>
      )}
      <HistoryNote what="Change counts" />
      <p className="lens-note">
        A heuristic for review effort, not a defect count.
      </p>
    </>
  );
}

function Dependencies() {
  const { snapshot, select, toggleView } = useRepo(),
    imports = snapshot.edges.filter((e) => e.kind === "import"),
    fanIn = useMemo(() => {
      const counts = new Map<string, number>();
      for (const e of imports)
        counts.set(e.target, (counts.get(e.target) ?? 0) + 1);
      return [...counts]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([id, n]) => ({
          node: snapshot.nodes.find((x) => x.id === id),
          n,
        }))
        .filter((x) => x.node);
    }, [snapshot]);
  return (
    <>
      <p className="lens-lead">
        {compact(imports.length)} resolved imports ·{" "}
        {snapshot.dependencies.length} external packages
      </p>
      <p className="lens-legend">
        Lines show resolved imports and calls. Select a file to trace its own.
      </p>
      <h3 className="lens-sub">Most imported</h3>
      <div className="legend-list">
        {fanIn.map(({ node, n }) => (
          <button
            key={node!.id}
            onClick={() => select(node!.id)}
            title={node!.path}
          >
            <span className="path">{node!.path}</span>
            <small>{n} importers</small>
          </button>
        ))}
        {!fanIn.length && (
          <p className="lens-empty">No resolved imports in this snapshot.</p>
        )}
      </div>
      <div className="lens-actions">
        <button
          className="secondary-button"
          onClick={() => toggleView("Dependencies")}
        >
          All imports and packages
        </button>
        <button
          className="secondary-button"
          onClick={() => toggleView("Functions")}
        >
          Function calls
        </button>
      </div>
    </>
  );
}

function Evolution() {
  const { snapshot, diff, diffBase, compareBase, theme, dimUnchanged, set } =
      useRepo(),
    ink = inks[theme];
  const byGroup = useMemo(() => {
    const counts = new Map<string, number>();
    for (const path of [...(diff?.added ?? []), ...(diff?.changed ?? [])]) {
      const g = snapshot.nodes.find((n) => n.path === path)?.group ?? "other";
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    const size = (g: string) =>
      snapshot.nodes.filter((n) => n.kind === "file" && n.group === g).length ||
      1;
    // Share of each group's files that changed, so a sweeping change still ranks groups honestly.
    return [...counts]
      .map(([g, n]) => [g, n, size(g)] as const)
      .sort((a, b) => b[1] / b[2] - a[1] / a[2] || b[1] - a[1])
      .slice(0, 4);
  }, [diff, snapshot]);
  if (!diff)
    return (
      <>
        <p className="lens-lead">
          Open a commit or drag across the time spine to compare two revisions.
        </p>
        <p className="lens-legend">
          Changed files get a revision cloud and a Δ tag, additions turn mint,
          removed files remain as dashed outlines.
        </p>
      </>
    );
  const touched = diff.added.length + diff.changed.length;
  return (
    <>
      <p className="lens-lead">
        {touched + diff.removed.length} files differ from{" "}
        <span className="mono">{diffBase?.slice(0, 7)}</span>
        {compareBase
          ? " (chosen base)"
          : diffBase &&
              useRepo
                .getState()
                .commits.findIndex((c) => c.sha === diffBase) ===
                useRepo
                  .getState()
                  .commits.findIndex((c) => c.sha === snapshot.sha) +
                  1
            ? " (parent commit)"
            : " (previously opened)"}
        .
      </p>
      <dl className="counts">
        <div>
          <dt>Added</dt>
          <dd style={{ color: ink.added }}>+{diff.added.length}</dd>
        </div>
        <div>
          <dt>Changed</dt>
          <dd style={{ color: ink.revision }}>{diff.changed.length}</dd>
        </div>
        <div>
          <dt>Removed</dt>
          <dd style={{ color: ink.revision }}>−{diff.removed.length}</dd>
        </div>
      </dl>
      <label className="lens-toggle">
        <input
          type="checkbox"
          checked={dimUnchanged}
          onChange={(e) => set({ dimUnchanged: e.target.checked })}
        />
        Dim unchanged files
      </label>
      {byGroup.length > 0 && (
        <>
          <h3 className="lens-sub">Share of each group changed</h3>
          <div className="group-bars">
            {byGroup.map(([g, n, total]) => (
              <div key={g}>
                <span>{g}</span>
                <span className="bar">
                  <i
                    style={{
                      width: `${(n / total) * 100}%`,
                      background: ink.ink,
                    }}
                  />
                </span>
                <small>
                  {n}/{total}
                </small>
              </div>
            ))}
          </div>
        </>
      )}
      <ChangedList />
      {compareBase && (
        <button className="secondary-button" onClick={clearCompare}>
          <X size={14} /> Clear comparison
        </button>
      )}
    </>
  );
}

type ChangeKind = "all" | "added" | "changed" | "renamed" | "removed";
/** Every difference of the comparison, filterable by kind; each row flies to its file. */
function ChangedList() {
  const { snapshot, diff, history, theme, locate } = useRepo(),
    [kind, setKind] = useState<ChangeKind>("all"),
    [limit, setLimit] = useState(12),
    ink = inks[theme];
  if (!diff) return null;
  const rows: {
    path: string;
    kind: Exclude<ChangeKind, "all">;
    note?: string;
  }[] = [
    ...diff.changed.map((path) => ({ path, kind: "changed" as const })),
    ...diff.added.map((path) => ({ path, kind: "added" as const })),
    ...diff.renamed.map((r) => ({
      path: r.to,
      kind: "renamed" as const,
      note: r.from,
    })),
    ...diff.removed.map((path) => ({ path, kind: "removed" as const })),
  ].sort(
    (a, b) =>
      (history?.files.get(b.path)?.changes ?? 0) -
        (history?.files.get(a.path)?.changes ?? 0) ||
      a.path.localeCompare(b.path),
  );
  const counts = {
      all: rows.length,
      added: diff.added.length,
      changed: diff.changed.length,
      renamed: diff.renamed.length,
      removed: diff.removed.length,
    },
    shown = rows.filter((r) => kind === "all" || r.kind === kind);
  const colour = {
    added: ink.added,
    changed: ink.revision,
    renamed: ink.ink,
    removed: ink.revision,
  };
  return (
    <>
      <h3 className="lens-sub">Changed files</h3>
      <div className="chip-row" role="group" aria-label="Filter changes">
        {(["all", "changed", "added", "renamed", "removed"] as const)
          .filter((k) => k === "all" || counts[k] > 0)
          .map((k) => (
            <button
              key={k}
              aria-pressed={kind === k}
              className={kind === k ? "active" : ""}
              onClick={() => {
                setKind(k);
                setLimit(12);
              }}
            >
              {k === "all" ? "All" : k[0].toUpperCase() + k.slice(1)}{" "}
              <span>{counts[k]}</span>
            </button>
          ))}
      </div>
      <div className="legend-list change-list">
        {shown.slice(0, limit).map((r) => {
          const node = snapshot.nodes.find(
              (n) => n.path === r.path && n.kind === "file",
            ),
            revisions = history?.files.get(r.path)?.changes;
          const body = (
            <>
              <i
                className={r.kind === "removed" ? "dashed" : undefined}
                style={{
                  background:
                    r.kind === "removed" ? "transparent" : colour[r.kind],
                  borderColor: colour[r.kind],
                }}
              />
              <span className="path">{r.path}</span>
              <small className={r.kind === "changed" ? "delta" : undefined}>
                {r.kind === "changed"
                  ? `Δ rev ${revisions ?? 1}`
                  : r.kind === "renamed"
                    ? "moved"
                    : r.kind === "added"
                      ? "new"
                      : "removed"}
              </small>
            </>
          );
          return node ? (
            <button
              key={r.kind + r.path}
              onClick={() => locate(node.id)}
              title={r.note ? `${r.note} → ${r.path}` : `Go to ${r.path}`}
            >
              {body}
            </button>
          ) : (
            <span
              key={r.kind + r.path}
              title={`${r.path} no longer exists in this revision`}
            >
              {body}
            </span>
          );
        })}
      </div>
      {shown.length > limit && (
        <button className="text-link" onClick={() => setLimit(limit + 40)}>
          Show {Math.min(40, shown.length - limit)} more of{" "}
          {shown.length - limit}
        </button>
      )}
    </>
  );
}

function Impact() {
  const { snapshot, selectedId, impactDepth, set, select, theme } = useRepo(),
    node = snapshot.nodes.find((n) => n.id === selectedId),
    ink = inks[theme],
    result = useMemo(
      () => (node ? impactOf(snapshot, node.id, impactDepth) : null),
      [snapshot, node, impactDepth],
    ),
    suggestions = useMemo(() => {
      const counts = new Map<string, number>();
      for (const e of snapshot.edges)
        if (e.kind === "import")
          counts.set(e.target, (counts.get(e.target) ?? 0) + 1);
      return [...counts]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => snapshot.nodes.find((n) => n.id === id))
        .filter((n) => !!n);
    }, [snapshot]);
  const depth = (
    <label className="lens-range">
      <span>
        Follow up to {impactDepth} {impactDepth === 1 ? "hop" : "hops"}
      </span>
      <input
        type="range"
        min={1}
        max={6}
        value={impactDepth}
        aria-label="Impact depth"
        onChange={(e) => set({ impactDepth: Number(e.target.value) })}
      />
    </label>
  );
  if (!node || !result)
    return (
      <>
        <p className="lens-lead">
          Select a file, function or group to see what depends on it.
        </p>
        <p className="lens-legend">
          Most imported files, a good place to start:
        </p>
        <div className="legend-list">
          {suggestions.map((n) => (
            <button key={n!.id} onClick={() => select(n!.id)} title={n!.path}>
              <span className="path">{n!.path}</span>
            </button>
          ))}
        </div>
        {depth}
      </>
    );
  const total = result.byHop.reduce((a, h) => a + h.length, 0),
    hopInk = (hop: number) =>
      hop === 1 ? ink.revision : hop === 2 ? ink.ink : ink.line;
  return (
    <>
      <p className="lens-lead">
        {total
          ? `${total} ${total === 1 ? "file depends" : "files depend"} on `
          : "Nothing indexed depends on "}
        <b>{node.name}</b>
        {total
          ? ` within ${result.byHop.length} ${result.byHop.length === 1 ? "hop" : "hops"}.`
          : "."}
      </p>
      {depth}
      {result.byHop.length > 0 && (
        <div className="group-bars">
          {result.byHop.map((files, i) => (
            <div key={i}>
              <span>Hop {i + 1}</span>
              <span className="bar">
                <i
                  style={{
                    width: `${(files.length / Math.max(...result.byHop.map((h) => h.length))) * 100}%`,
                    background: hopInk(i + 1),
                  }}
                />
              </span>
              <small>{files.length}</small>
            </div>
          ))}
        </div>
      )}
      {result.byHop[0] && (
        <>
          <h3 className="lens-sub">Direct dependents</h3>
          <div className="legend-list">
            {result.byHop[0].slice(0, 8).map((id) => {
              const n = snapshot.nodes.find((x) => x.id === id);
              return (
                n && (
                  <button key={id} onClick={() => select(id)} title={n.path}>
                    <i style={{ background: ink.revision }} />
                    <span className="path">{n.path}</span>
                  </button>
                )
              );
            })}
          </div>
        </>
      )}
      <p className="lens-note">
        A lower bound: only resolved imports and calls are followed
        {result.unresolved
          ? `; ${result.unresolved} imports could not be resolved`
          : ""}
        {result.truncated ? ". More dependents lie beyond this depth." : "."}
      </p>
    </>
  );
}

function Authors() {
  const { snapshot, history, theme } = useRepo(),
    result = useMemo(
      () =>
        history ? authorship(snapshot, history) : { ranked: [], unknown: 0 },
      [snapshot, history],
    ),
    names = result.ranked.map((r) => r.author),
    total = snapshot.nodes.filter((n) => n.kind === "file").length;
  return (
    <>
      <p className="lens-lead">Colour shows who last changed each file.</p>
      <div className="legend-list static">
        {result.ranked.slice(0, 6).map((r) => (
          <span key={r.author}>
            <i style={{ background: authorColor(r.author, names, theme) }} />
            <span>{r.author}</span>
            <small>{r.files} files</small>
          </span>
        ))}
        {result.ranked.length > 6 && (
          <span>
            <i style={{ background: inks[theme].muted }} />
            <span>{result.ranked.length - 6} more authors</span>
          </span>
        )}
        {result.unknown > 0 && (
          <span>
            <i style={{ background: inks[theme].muted }} />
            <span>Not changed in opened commits</span>
            <small>
              {result.unknown} of {total} files
            </small>
          </span>
        )}
      </div>
      <HistoryNote what="Last authors" />
    </>
  );
}

const bodies: Record<Exclude<Lens, "pipelines">, () => React.ReactNode> = {
  impact: Impact,
  architecture: Architecture,
  hotspots: Hotspots,
  dependencies: Dependencies,
  evolution: Evolution,
  authors: Authors,
};

export function LensCard() {
  const { lens } = useRepo(),
    [collapsed, setCollapsed] = useState(
      typeof innerWidth !== "undefined" && innerWidth < 760,
    );
  if (lens === "pipelines") return null;
  const Body = bodies[lens],
    meta = lenses.find((l) => l.id === lens)!;
  return (
    <section
      className={`lens-card ${collapsed ? "collapsed" : ""}`}
      aria-label={`${meta.name} lens`}
    >
      <header>
        <FolderTree size={15} strokeWidth={1.6} aria-hidden="true" />
        <h2>{meta.question}</h2>
        <button
          className="icon-button"
          aria-label={collapsed ? "Expand lens card" : "Collapse lens card"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
      </header>
      {!collapsed && (
        <div className="lens-body scroll-area">
          <Scope />
          <Body />
        </div>
      )}
    </section>
  );
}
