import { useMemo, useState } from "react";
import { Braces, FileCode2, Minus, Plus, Crosshair } from "lucide-react";
import { useRepo } from "./state";
import { flowFrom, entryPoints } from "../../../packages/core/src/flow";
import { architecture } from "../../../packages/core/src/architecture";
import { scriptPipeline } from "../../../packages/core/src/scripts";
import { Pipelines } from "./Workspaces";

function Zoom({ zoom, set }: { zoom: number; set: (z: number) => void }) {
  return (
    <div className="diagram-zoom" role="group" aria-label="Diagram zoom">
      <button
        className="icon-button"
        aria-label="Zoom out diagram"
        onClick={() => set(Math.max(0.4, zoom / 1.25))}
      >
        <Minus size={15} />
      </button>
      <span className="mono">{Math.round(zoom * 100)}%</span>
      <button
        className="icon-button"
        aria-label="Zoom in diagram"
        onClick={() => set(Math.min(2.5, zoom * 1.25))}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

const BOX_W = 210,
  BOX_H = 52,
  COL_GAP = 90,
  ROW_GAP = 18;

/** How a function or file runs: what it calls (or imports), step by step, drawn left to right. */
export function FlowDiagram() {
  const { snapshot, selectedId, flowDepth, set, select, locate } = useRepo(),
    entries = useMemo(() => entryPoints(snapshot, 12), [snapshot]),
    startId =
      selectedId &&
      snapshot.nodes.some((n) => n.id === selectedId && n.kind !== "package")
        ? selectedId
        : entries[0]?.node.id,
    flow = useMemo(
      () => (startId ? flowFrom(snapshot, startId, flowDepth) : null),
      [snapshot, startId, flowDepth],
    ),
    [zoom, setZoom] = useState(1);
  const layout = useMemo(() => {
    const at = new Map<string, { x: number; y: number }>(),
      rows = new Map<number, number>();
    if (!flow) return { at, width: 0, height: 0 };
    for (const step of flow.steps) {
      const row = rows.get(step.depth) ?? 0;
      rows.set(step.depth, row + 1);
      at.set(step.id, {
        x: 24 + step.depth * (BOX_W + COL_GAP),
        y: 24 + row * (BOX_H + ROW_GAP),
      });
    }
    return {
      at,
      width:
        48 +
        Math.max(...[...rows.keys()].map((d) => d + 1)) * (BOX_W + COL_GAP) -
        COL_GAP,
      height: 48 + Math.max(...rows.values()) * (BOX_H + ROW_GAP),
    };
  }, [flow]);
  const node = (id: string) => snapshot.nodes.find((n) => n.id === id);
  return (
    <div className="diagram-workspace">
      <aside className="diagram-side scroll-area">
        <h2 className="lens-sub">Start from</h2>
        <p className="view-explanation">
          Entry points are functions nothing resolved calls and files nothing
          imports, ranked by how much they reach.
        </p>
        <div className="legend-list">
          {entries.map((e) => (
            <button
              key={e.node.id}
              className={e.node.id === startId ? "active" : ""}
              aria-pressed={e.node.id === startId}
              onClick={() => select(e.node.id)}
              title={e.node.path}
            >
              {e.kind === "calls" ? (
                <Braces size={13} />
              ) : (
                <FileCode2 size={13} />
              )}
              <span className="path">
                {e.kind === "calls" ? `${e.node.name}()` : e.node.path}
              </span>
              <small>reaches {e.reach}</small>
            </button>
          ))}
          {!entries.length && (
            <p className="lens-empty">
              No resolved calls or imports to start from in this snapshot.
            </p>
          )}
        </div>
        <label className="lens-range">
          <span>
            Follow {flowDepth} {flowDepth === 1 ? "step" : "steps"}
          </span>
          <input
            type="range"
            min={1}
            max={8}
            value={flowDepth}
            aria-label="Flow depth"
            onChange={(e) => set({ flowDepth: Number(e.target.value) })}
          />
        </label>
        <p className="view-explanation">
          Only statically resolved{" "}
          {flow?.kind === "imports" ? "imports" : "calls"} are drawn. Callbacks,
          dynamic dispatch and calls into packages are not.
        </p>
      </aside>
      <div className="diagram-pane">
        <div className="pipeline-map-tools">
          <span>
            <b>
              {flow
                ? flow.kind === "calls"
                  ? `${flow.start.name}()`
                  : flow.start.name
                : "No flow"}
            </b>
            {flow && (
              <small className="muted">
                {" "}
                {flow.steps.length - 1}{" "}
                {flow.kind === "calls" ? "functions" : "files"} in{" "}
                {Math.max(0, ...flow.steps.map((s) => s.depth))} steps
                {flow.truncated ? " · more beyond" : ""}
              </small>
            )}
          </span>
          <div>
            {flow && (
              <button
                className="secondary-button"
                onClick={() => locate(flow.start.id)}
              >
                <Crosshair size={14} /> Show in cloud
              </button>
            )}
            <Zoom zoom={zoom} set={setZoom} />
          </div>
        </div>
        <div className="diagram-canvas scroll-area">
          {flow ? (
            <svg
              width={layout.width * zoom}
              height={layout.height * zoom}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              role="img"
              aria-label={`Flow from ${flow.start.name}`}
            >
              <defs>
                <marker
                  id="flow-arrow"
                  markerUnits="userSpaceOnUse"
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto"
                >
                  <path d="M0 0 8 4 0 8z" className="diagram-arrowhead" />
                </marker>
              </defs>
              {flow.links.map((l, i) => {
                const a = layout.at.get(l.source),
                  b = layout.at.get(l.target);
                if (!a || !b) return null;
                const tree =
                    flow.steps.find((s) => s.id === l.target)?.via === l.source,
                  x1 = a.x + BOX_W,
                  y1 = a.y + BOX_H / 2,
                  x2 = b.x,
                  y2 = b.y + BOX_H / 2,
                  back = x2 <= x1,
                  mid = (x1 + x2) / 2;
                return (
                  <path
                    key={i}
                    className={`diagram-link ${tree ? "tree" : "cross"}`}
                    d={
                      back
                        ? `M${x1} ${y1} C${x1 + 60} ${y1} ${x2 - 60} ${y2} ${x2} ${y2}`
                        : `M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`
                    }
                    markerEnd="url(#flow-arrow)"
                  />
                );
              })}
              {flow.steps.map((step) => {
                const n = node(step.id),
                  p = layout.at.get(step.id)!;
                if (!n) return null;
                return (
                  <g
                    key={step.id}
                    transform={`translate(${p.x},${p.y})`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Follow ${n.name}`}
                    className={`diagram-box ${step.depth === 0 ? "start" : ""}`}
                    onClick={() => select(step.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        select(step.id);
                      }
                    }}
                  >
                    <rect width={BOX_W} height={BOX_H} rx={3} />
                    <text x={12} y={21} className="diagram-name">
                      {(n.kind === "function" ? `${n.name}()` : n.name).slice(
                        0,
                        26,
                      )}
                    </text>
                    <text x={12} y={39} className="diagram-path">
                      {n.path.length > 26 ? "…" + n.path.slice(-25) : n.path}
                      {n.line ? `:${n.line}` : ""}
                    </text>
                    <title>{n.path}</title>
                  </g>
                );
              })}
            </svg>
          ) : (
            <div className="view-empty">
              <h2>Nothing to follow</h2>
              <p>
                Select a function or file, or pick a starting point on the left.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Groups and their top folders as boxes, linked by how many imports cross between them. */
export function ArchitectureDiagram() {
  const { snapshot, locate } = useRepo(),
    model = useMemo(() => architecture(snapshot), [snapshot]),
    [hover, setHover] = useState<string | null>(null),
    [zoom, setZoom] = useState(1),
    [limit, setLimit] = useState(40);
  const W = 230,
    H = 46,
    GAP = 12,
    HEAD = 34,
    COL = 340;
  const layout = useMemo(() => {
    const columns = new Map<number, string[]>();
    for (const g of model.groups)
      columns.set(g.rank, [...(columns.get(g.rank) ?? []), g.group]);
    const frames = new Map<string, { x: number; y: number; h: number }>(),
      at = new Map<string, { x: number; y: number }>();
    let width = 0,
      height = 0;
    [...columns.keys()]
      .sort((a, b) => a - b)
      .forEach((rank, c) => {
        let y = 24;
        for (const group of columns.get(rank)!) {
          const boxes = model.boxes
              .filter((b) => b.group === group)
              .slice(0, 12),
            h = HEAD + boxes.length * (H + GAP) + GAP;
          frames.set(group, { x: 24 + c * COL, y, h });
          boxes.forEach((b, i) =>
            at.set(b.id, { x: 24 + c * COL + 16, y: y + HEAD + i * (H + GAP) }),
          );
          y += h + 28;
        }
        width = Math.max(width, 24 + c * COL + W + 32 + 24);
        height = Math.max(height, y);
      });
    return { frames, at, width, height };
  }, [model]);
  const links = model.links
      .filter((l) => layout.at.has(l.source) && layout.at.has(l.target))
      .slice(0, limit),
    max = Math.max(1, ...links.map((l) => l.weight));
  return (
    <div className="diagram-workspace single">
      <div className="diagram-pane">
        <div className="pipeline-map-tools">
          <span>
            <b>{model.groups.length} groups</b>
            <small className="muted">
              {" "}
              · {model.boxes.length} folders · {model.links.length} import
              routes, the {links.length} strongest drawn
            </small>
          </span>
          <div>
            {model.links.length > limit && (
              <button
                className="secondary-button"
                onClick={() => setLimit(limit + 40)}
              >
                Draw more routes
              </button>
            )}
            <Zoom zoom={zoom} set={setZoom} />
          </div>
        </div>
        <p className="view-explanation diagram-note">
          Arrows point from the importing folder to the folder it uses;
          thickness is the number of resolved imports. Groups further right are
          used by groups to their left. Point at or tap a folder to isolate its
          routes.
        </p>
        <div className="diagram-canvas scroll-area">
          <svg
            width={layout.width * zoom}
            height={layout.height * zoom}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            role="img"
            aria-label="Architecture diagram"
          >
            <defs>
              <marker
                id="arch-arrow"
                markerUnits="userSpaceOnUse"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0 0 8 4 0 8z" className="diagram-arrowhead" />
              </marker>
            </defs>
            {[...layout.frames].map(([group, f]) => (
              <g key={group} className="arch-group">
                <rect x={f.x} y={f.y} width={W + 32} height={f.h} rx={3} />
                <text
                  x={f.x + 14}
                  y={f.y + 22}
                  className="arch-group-label"
                  role="button"
                  tabIndex={0}
                  onClick={() => locate(`pkg:${group}`)}
                  onKeyDown={(e) => e.key === "Enter" && locate(`pkg:${group}`)}
                >
                  {group.toUpperCase()}
                </text>
              </g>
            ))}
            {(() => {
              // Spread arrow ends along each box side so routes do not pile into one point.
              const ports = new Map<string, number>(),
                port = (id: string, side: "in" | "out") => {
                  const key = `${id}:${side}`,
                    n = ports.get(key) ?? 0;
                  ports.set(key, n + 1);
                  return 10 + ((n * 9) % (H - 20));
                };
              return links.map((l, i) => {
                const a = layout.at.get(l.source)!,
                  b = layout.at.get(l.target)!,
                  lit = !hover || hover === l.source || hover === l.target,
                  sameColumn = Math.abs(a.x - b.x) < 10,
                  forward = a.x < b.x,
                  x1 = sameColumn || forward ? a.x + W : a.x,
                  x2 = sameColumn ? b.x + W : forward ? b.x : b.x + W,
                  y1 = a.y + port(l.source, "out"),
                  y2 = b.y + port(l.target, "in"),
                  bend = sameColumn ? 46 + (i % 4) * 10 : Math.abs(x2 - x1) / 2;
                return (
                  <path
                    key={i}
                    className={`diagram-link arch ${lit ? (hover ? "lit" : "") : "faded"}`}
                    style={{ strokeWidth: 0.8 + (l.weight / max) * 2.6 }}
                    d={
                      sameColumn
                        ? `M${x1} ${y1} C${x1 + bend} ${y1} ${x2 + bend} ${y2} ${x2} ${y2}`
                        : forward
                          ? `M${x1} ${y1} C${x1 + bend} ${y1} ${x2 - bend} ${y2} ${x2} ${y2}`
                          : `M${x1} ${y1} C${x1 - bend} ${y1} ${x2 + bend} ${y2} ${x2} ${y2}`
                    }
                    markerEnd="url(#arch-arrow)"
                  >
                    <title>
                      {l.source} → {l.target}: {l.weight} imports
                    </title>
                  </path>
                );
              });
            })()}
            {model.boxes
              .filter((b) => layout.at.has(b.id))
              .map((b) => {
                const p = layout.at.get(b.id)!;
                return (
                  <g
                    key={b.id}
                    transform={`translate(${p.x},${p.y})`}
                    className={`diagram-box ${hover === b.id ? "start" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Isolate routes of ${b.id}`}
                    aria-pressed={hover === b.id}
                    onPointerEnter={(e) =>
                      e.pointerType === "mouse" && setHover(b.id)
                    }
                    onPointerLeave={(e) =>
                      e.pointerType === "mouse" && setHover(null)
                    }
                    onClick={() => setHover(hover === b.id ? null : b.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setHover(hover === b.id ? null : b.id);
                      }
                    }}
                  >
                    <rect width={W} height={H} rx={3} />
                    <text x={12} y={20} className="diagram-name">
                      {b.label.slice(0, 28)}
                    </text>
                    <text x={12} y={37} className="diagram-path">
                      {b.files} files · {b.loc.toLocaleString("en")} lines
                    </text>
                    <title>{b.id}</title>
                  </g>
                );
              })}
          </svg>
        </div>
      </div>
    </div>
  );
}

/** npm scripts as a pipeline: what runs what, and which CI jobs call it. */
export function ScriptPipeline() {
  const { snapshot } = useRepo(),
    steps = useMemo(() => scriptPipeline(snapshot), [snapshot]),
    manifests = [...new Set(steps.map((s) => s.manifest))];
  if (!snapshot.scripts)
    return (
      <div className="view-empty">
        <h2>Scripts not read yet</h2>
        <p>
          This snapshot was analyzed before scripts were recorded. Open the
          repository again to read them.
        </p>
      </div>
    );
  if (!steps.length)
    return (
      <div className="view-empty">
        <h2>No npm scripts</h2>
        <p>No package.json in this snapshot defines scripts.</p>
      </div>
    );
  const called = new Set(
    steps.flatMap((s) => s.runs.map((r) => `${s.manifest}:${r}`)),
  );
  return (
    <div className="script-pipeline scroll-area">
      {manifests.map((m) => (
        <section key={m} className="script-manifest">
          <h2 className="lens-sub">{m}</h2>
          <ol>
            {steps
              .filter((s) => s.manifest === m)
              .sort(
                (a, b) =>
                  Number(called.has(a.id)) - Number(called.has(b.id)) ||
                  a.name.localeCompare(b.name),
              )
              .map((s) => (
                <li key={s.id} className={called.has(s.id) ? "called" : ""}>
                  <div className="script-head">
                    <b className="mono">{s.name}</b>
                    {s.ci.map((job) => (
                      <span
                        key={job}
                        className="tag"
                        title="Run by this CI job"
                      >
                        CI · {job}
                      </span>
                    ))}
                  </div>
                  <code>{s.command}</code>
                  {s.runs.length > 0 && (
                    <p className="script-runs">
                      runs{" "}
                      {s.runs.map((r, i) => (
                        <span key={r}>
                          {i > 0 && " → "}
                          <b className="mono">{r}</b>
                        </span>
                      ))}
                    </p>
                  )}
                </li>
              ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** Pipelines shows CI workflows and the npm scripts they run, side by side. */
export function PipelinesWithScripts() {
  const [tab, setTab] = useState<"ci" | "scripts">("ci");
  return (
    <>
      <div className="workspace-tabs">
        <div className="segmented" aria-label="Pipeline kind">
          <button
            aria-pressed={tab === "ci"}
            className={tab === "ci" ? "active" : ""}
            onClick={() => setTab("ci")}
          >
            CI workflows
          </button>
          <button
            aria-pressed={tab === "scripts"}
            className={tab === "scripts" ? "active" : ""}
            onClick={() => setTab("scripts")}
          >
            npm scripts
          </button>
        </div>
      </div>
      {tab === "ci" ? <Pipelines /> : <ScriptPipeline />}
    </>
  );
}
