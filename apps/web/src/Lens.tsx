import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FolderTree,
  ListTree,
  Network,
  Layers3,
  X,
} from "lucide-react";
import { useRepo, lenses, clearCompare, type Lens } from "./state";
import { GroupVisibility } from "./ExplorationControls";
import { authorColor, groupColor, inks } from "./colors";
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
      <nav className="lenses" aria-label="Lenses" data-hint="lenses">
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
  const { snapshot, diff, diffBase, compareBase, select, theme } = useRepo(),
    ink = inks[theme];
  const byGroup = useMemo(() => {
    const counts = new Map<string, number>();
    for (const path of [...(diff?.added ?? []), ...(diff?.changed ?? [])]) {
      const g = snapshot.nodes.find((n) => n.path === path)?.group ?? "other";
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [diff, snapshot]);
  if (!diff)
    return (
      <>
        <p className="lens-lead">
          Open a commit or drag across the time spine to compare two revisions.
        </p>
        <p className="lens-legend">
          Changed files get a revision cloud, additions turn mint, removals fade
          out as outlines.
        </p>
      </>
    );
  const top = byGroup[0]?.[1] ?? 1,
    touched = diff.added.length + diff.changed.length;
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
      {byGroup.length > 0 && (
        <>
          <h3 className="lens-sub">Most changed groups</h3>
          <div className="group-bars">
            {byGroup.map(([g, n]) => (
              <div key={g}>
                <span>{g}</span>
                <span className="bar">
                  <i
                    style={{
                      width: `${(n / top) * 100}%`,
                      background: ink.ink,
                    }}
                  />
                </span>
                <small>{n}</small>
              </div>
            ))}
          </div>
        </>
      )}
      <h3 className="lens-sub">Changed files</h3>
      <div className="legend-list">
        {[...diff.changed, ...diff.added].slice(0, 6).map((path) => {
          const node = snapshot.nodes.find(
            (n) => n.path === path && n.kind === "file",
          );
          return (
            node && (
              <button key={path} onClick={() => select(node.id)} title={path}>
                <i
                  style={{
                    background: diff.added.includes(path)
                      ? ink.added
                      : ink.revision,
                  }}
                />
                <span className="path">{path}</span>
              </button>
            )
          );
        })}
      </div>
      {compareBase && (
        <button className="secondary-button" onClick={clearCompare}>
          <X size={14} /> Clear comparison
        </button>
      )}
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
