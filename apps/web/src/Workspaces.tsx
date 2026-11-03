import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Box,
  Braces,
  ChevronRight,
  ExternalLink,
  FileCode2,
  GitBranch,
  Maximize2,
  Search,
  Workflow,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { pipelineDepths } from "../../../packages/core/src/pipeline";
import { useRepo } from "./state";
import {
  ArchitectureDiagram,
  FlowDiagram,
  PipelinesWithScripts,
} from "./Diagrams";
const descriptions = {
  Dependencies: "Understand which files and packages depend on each other.",
  Functions: "Find definitions and follow statically resolved calls.",
  Pipelines:
    "Explore workflow dependencies, run results, steps and the npm scripts they run.",
  Flow: "Follow what a function calls, or what a file imports, step by step.",
  Architecture:
    "Folders as boxes, linked by how many resolved imports cross between them.",
};
export function AnalysisWorkspace() {
  const { view } = useRepo();
  if (view === "Explore") return null;
  return (
    <section className="analysis-workspace" aria-label={`${view} workspace`}>
      <header className="analysis-heading">
        <button
          className="back-button"
          aria-label="Back to cloud"
          onClick={() => useRepo.getState().toggleView("Explore")}
        >
          <ArrowLeft size={18} />
          <span>Cloud</span>
        </button>
        <div>
          <h1>{view}</h1>
          <p>{descriptions[view]}</p>
        </div>
        <button
          className="icon-button close-view"
          aria-label={`Close ${view.toLowerCase()}`}
          onClick={() => useRepo.getState().toggleView("Explore")}
        >
          <X size={19} />
        </button>
      </header>
      {view === "Dependencies" ? (
        <Dependencies />
      ) : view === "Functions" ? (
        <Functions />
      ) : view === "Flow" ? (
        <FlowDiagram />
      ) : view === "Architecture" ? (
        <ArchitectureDiagram />
      ) : (
        <PipelinesWithScripts />
      )}
    </section>
  );
}
function Filter({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <label className="workspace-filter">
      <Search size={17} />
      <input
        type="search"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Dependencies() {
  const { snapshot, locate } = useRepo(),
    [query, setQuery] = useState(""),
    [limit, setLimit] = useState(100),
    [kind, setKind] = useState<"internal" | "external">("internal");
  const nodes = useMemo(
    () => new Map(snapshot.nodes.map((n) => [n.id, n])),
    [snapshot],
  );
  const edges = useMemo(
    () =>
      snapshot.edges.filter(
        (e) =>
          e.kind === "import" &&
          (!query ||
            `${e.source} ${e.target}`
              .toLowerCase()
              .includes(query.toLowerCase())),
      ),
    [snapshot, query],
  );
  const packages = snapshot.dependencies.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="analysis-body">
      <div className="analysis-controls">
        <div className="segmented">
          <button
            aria-pressed={kind === "internal"}
            onClick={() => {
              setKind("internal");
              setLimit(100);
            }}
          >
            File imports <span>{edges.length}</span>
          </button>
          <button
            aria-pressed={kind === "external"}
            onClick={() => {
              setKind("external");
              setLimit(100);
            }}
          >
            External packages <span>{packages.length}</span>
          </button>
        </div>
        <Filter
          label="Filter dependencies"
          value={query}
          onChange={(v) => {
            setQuery(v);
            setLimit(100);
          }}
        />
      </div>
      <p className="view-explanation">
        {kind === "internal"
          ? "Each row is a resolved import. Open either file in the cloud to inspect its connections."
          : "Versions come from manifests and supported lockfiles. Development packages are marked separately."}
      </p>
      <div className="dependency-list">
        {kind === "internal"
          ? edges.slice(0, limit).map((e) => (
              <div className="import-row" key={e.id}>
                <button onClick={() => locate(e.source)}>
                  <FileCode2 size={16} />
                  <span>
                    {nodes.get(e.source)?.name ?? e.source}
                    <small>{e.source}</small>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
                <ChevronRight className="import-direction" size={18} />
                <button onClick={() => locate(e.target)}>
                  <span>
                    {nodes.get(e.target)?.name ?? e.target}
                    <small>{e.target}</small>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              </div>
            ))
          : packages.slice(0, limit).map((d, i) => (
              <div
                className="package-entry"
                key={`${d.manifest}:${d.name}:${i}`}
              >
                <Box size={19} />
                <div>
                  <strong>{d.name}</strong>
                  <small>{d.manifest ?? "package.json"}</small>
                </div>
                <code>{d.version}</code>
                <span className="tag">
                  {d.dev ? "Development" : "Production"}
                </span>
              </div>
            ))}
      </div>
      {(kind === "internal" ? edges.length : packages.length) === 0 && (
        <div className="view-empty">
          <Box size={25} />
          <h2>No matching dependencies</h2>
          <p>
            {query
              ? "Try another file or package name."
              : "No relationships of this type were resolved in this snapshot."}
          </p>
        </div>
      )}
      {(kind === "internal" ? edges.length : packages.length) > limit && (
        <button className="load-more" onClick={() => setLimit(limit + 100)}>
          Show 100 more
        </button>
      )}
    </div>
  );
}
function Functions() {
  const { snapshot, selectedId, set, locate } = useRepo(),
    [query, setQuery] = useState(""),
    [limit, setLimit] = useState(100),
    functions = useMemo(
      () => snapshot.nodes.filter((n) => n.kind === "function"),
      [snapshot],
    );
  const filtered = functions.filter((n) =>
      `${n.name} ${n.path}`.toLowerCase().includes(query.toLowerCase()),
    ),
    selected = functions.find((n) => n.id === selectedId) ?? filtered[0],
    nodes = useMemo(
      () => new Map(snapshot.nodes.map((n) => [n.id, n])),
      [snapshot],
    );
  const relationships = snapshot.edges.filter(
    (e) =>
      e.kind === "call" &&
      (e.source === selected?.id || e.target === selected?.id),
  );
  return (
    <div className="functions-workspace">
      <section className="function-list-pane">
        <div className="function-list-heading">
          <Filter
            label="Search functions"
            value={query}
            onChange={(v) => {
              setQuery(v);
              setLimit(100);
            }}
          />
          <span>{filtered.length.toLocaleString()} definitions</span>
        </div>
        <div className="function-list scroll-area">
          {filtered.slice(0, limit).map((fn) => (
            <button
              className={`function-entry ${selected?.id === fn.id ? "active" : ""}`}
              key={fn.id}
              onClick={() =>
                set({
                  selectedId: fn.id,
                  inspector: "node",
                  inspectorOpen: false,
                })
              }
            >
              <Braces size={17} />
              <span>
                {fn.name}
                <small>
                  {fn.path}:{fn.line}
                </small>
              </span>
              <ChevronRight size={15} />
            </button>
          ))}
          {filtered.length > limit && (
            <button className="load-more" onClick={() => setLimit(limit + 100)}>
              Show 100 more
            </button>
          )}
          {!filtered.length && (
            <p className="view-explanation">
              No matching definitions. Function analysis is available for
              supported JavaScript and TypeScript sources.
            </p>
          )}
        </div>
      </section>
      <section
        className="function-detail scroll-area"
        aria-label="Function details"
      >
        {selected ? (
          <>
            <div className="function-title">
              <Braces size={26} />
              <div>
                <h2>{selected.name}</h2>
                <p>
                  {selected.path}:{selected.line}
                </p>
              </div>
            </div>
            <div className="function-metrics">
              <span>
                <strong>{selected.loc}</strong> lines
              </span>
              <span>
                <strong>{selected.complexity ?? "—"}</strong> complexity
              </span>
              <span>
                <strong>{relationships.length}</strong> calls / callers
              </span>
            </div>
            <button
              className="primary-button"
              onClick={() => locate(selected.id)}
            >
              Show in cloud
              <ArrowUpRight size={16} />
            </button>
            <h3>Resolved relationships</h3>
            {relationships.length ? (
              relationships.map((e) => {
                const target = nodes.get(
                  e.source === selected.id ? e.target : e.source,
                );
                return (
                  target && (
                    <button
                      className="call-entry"
                      key={e.id}
                      onClick={() =>
                        set({
                          selectedId: target.id,
                          inspector: "node",
                          inspectorOpen: false,
                        })
                      }
                    >
                      <GitBranch size={17} />
                      <span>
                        {target.name}
                        <small>
                          {e.source === selected.id ? "Calls" : "Called by"} ·{" "}
                          {target.path}
                        </small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  )
                );
              })
            ) : (
              <p className="view-explanation">
                No statically resolved calls for this definition. Dynamic calls
                are not inferred.
              </p>
            )}
          </>
        ) : (
          <div className="view-empty">
            <Braces size={28} />
            <h2>No function selected</h2>
            <p>Choose a supported definition from the list.</p>
          </div>
        )}
      </section>
    </div>
  );
}
export function Pipelines() {
  const { snapshot } = useRepo(),
    jobs = snapshot.pipeline.jobs,
    [selectedId, setSelected] = useState<string | null>(null),
    [zoom, setZoom] = useState(1),
    [width, setWidth] = useState(1000),
    container = useRef<HTMLDivElement>(null);
  const job = jobs.find((j) => j.id === selectedId) ?? jobs[0],
    topology = useMemo(() => pipelineDepths(jobs), [jobs]),
    vertical = width < 860;
  useEffect(() => {
    if (!container.current) return;
    const element = container.current,
      observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);
  const positions = useMemo(() => {
    const rows = new Map<number, number>(),
      result = new Map<string, { x: number; y: number }>();
    for (const j of jobs) {
      const depth = topology.depths.get(j.id) ?? 0,
        row = rows.get(depth) ?? 0;
      rows.set(depth, row + 1);
      result.set(
        j.id,
        vertical
          ? { x: 35 + row * 235, y: 30 + depth * 115 }
          : { x: 35 + depth * 235, y: 30 + row * 115 },
      );
    }
    return result;
  }, [jobs, topology, vertical]);
  const graphWidth = Math.max(
      250,
      ...[...positions.values()].map((p) => p.x + 225),
    ),
    graphHeight = Math.max(
      160,
      ...[...positions.values()].map((p) => p.y + 100),
    ),
    fit = Math.max(0.8, Math.min(1, width / graphWidth)),
    scale = fit * zoom;
  return (
    <div className="pipeline-workspace">
      <div className="pipeline-map-pane">
        <div className="pipeline-map-tools">
          <span>
            <Workflow size={17} />
            Workflow jobs <b>{jobs.length}</b>
          </span>
          <div>
            <button
              className="icon-button"
              aria-label="Zoom out workflow"
              onClick={() => setZoom(Math.max(0.8, zoom - 0.2))}
            >
              <ZoomOut size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Fit workflow"
              onClick={() => setZoom(1)}
            >
              <Maximize2 size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Zoom in workflow"
              onClick={() => setZoom(Math.min(2, zoom + 0.2))}
            >
              <ZoomIn size={17} />
            </button>
          </div>
        </div>
        <div className="pipeline-map scroll-area" ref={container}>
          {jobs.length ? (
            <svg
              width={graphWidth * scale}
              height={graphHeight * scale}
              viewBox={`0 0 ${graphWidth} ${graphHeight}`}
              aria-label="Workflow dependency graph"
            >
              {snapshot.pipeline.edges.map((e, i) => {
                const a = positions.get(e.source),
                  b = positions.get(e.target);
                if (!a || !b) return null;
                return (
                  <path
                    key={i}
                    d={
                      vertical
                        ? `M${a.x + 95},${a.y + 70} C${a.x + 95},${a.y + 100} ${b.x + 95},${b.y - 30} ${b.x + 95},${b.y}`
                        : `M${a.x + 190},${a.y + 35} C${a.x + 215},${a.y + 35} ${b.x - 25},${b.y + 35} ${b.x},${b.y + 35}`
                    }
                    className="pipe-edge"
                  />
                );
              })}
              {jobs.map((j) => {
                const p = positions.get(j.id)!;
                return (
                  <g
                    key={j.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Inspect job ${j.name}`}
                    aria-pressed={job?.id === j.id}
                    transform={`translate(${p.x},${p.y})`}
                    onClick={() => setSelected(j.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(j.id);
                      }
                    }}
                  >
                    <rect
                      width={190}
                      height={70}
                      rx={3}
                      className={`pipe-job ${j.status} ${job?.id === j.id ? "selected" : ""}`}
                    />
                    <text x={17} y={28} className="pipe-name">
                      {j.name.slice(0, 20)}
                    </text>
                    <text x={17} y={51} className={`pipe-status ${j.status}`}>
                      {j.status === "unavailable"
                        ? "No run available"
                        : j.status}
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : (
            <div className="view-empty">
              <Workflow size={28} />
              <h2>No GitHub Actions workflow</h2>
              <p>This snapshot contains no supported workflow configuration.</p>
            </div>
          )}
        </div>
        {jobs.length > 0 && (
          <p className="map-hint">
            {vertical
              ? "Scroll down to follow stages."
              : "Scroll across to follow stages."}{" "}
            Select a job to read its steps.
          </p>
        )}
        {topology.cycles.length > 0 && (
          <p className="coverage-note" role="alert">
            This workflow contains cyclic or blocked dependencies.
          </p>
        )}
      </div>
      <aside
        className="pipeline-job-details scroll-area"
        aria-label="Job details"
      >
        {job ? (
          <>
            <span className="tag">
              {job.status === "unavailable" ? "No run available" : job.status}
            </span>
            <h2>{job.name}</h2>
            <p className="view-explanation">{job.workflow}</p>
            {job.needs.length > 0 && (
              <p className="view-explanation">
                Needs:{" "}
                {job.needs
                  .map((id) => jobs.find((j) => j.id === id)?.name ?? id)
                  .join(", ")}
              </p>
            )}
            {job.condition && (
              <p className="view-explanation">
                Condition: <code>{job.condition}</code>
              </p>
            )}
            {job.reusable && (
              <p className="view-explanation">
                Reusable workflow: <code>{job.reusable}</code>
              </p>
            )}
            <h3>Steps</h3>
            <ol className="workflow-steps">
              {job.steps.map((step, i) => (
                <li key={i}>
                  <code>{step}</code>
                </li>
              ))}
            </ol>
            {job.url && (
              <a
                className="github-link"
                href={job.url}
                target="_blank"
                rel="noreferrer"
              >
                Open run on GitHub
                <ExternalLink size={15} />
              </a>
            )}
          </>
        ) : (
          <p className="view-explanation">
            Choose a workflow job to inspect its steps.
          </p>
        )}
        {snapshot.pipeline.warnings.map((warning, i) => (
          <p className="coverage-note" key={i}>
            {warning}
          </p>
        ))}
      </aside>
    </div>
  );
}
