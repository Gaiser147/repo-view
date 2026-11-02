import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  Box,
  Braces,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  Cuboid,
  Focus,
  GitBranch,
  GitFork as Github,
  Layers3,
  ListTree,
  LoaderCircle,
  Maximize2,
  Network,
  Pause,
  Play,
  Search,
  Settings2,
  ShieldCheck,
  Workflow,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { rateSnapshot } from "../../../packages/core/src/health";
import { hash } from "../../../packages/core/src/layout";
import { useRepo, loadRepository, openDemo, json, type View } from "./state";
import { Files, Inspector, PipelineDetail } from "./Panels";
import { Timeline, PipelineStrip } from "./Timeline";
const Graph = lazy(() => import("./Graph").then((m) => ({ default: m.Graph })));
const nav = [
  { name: "Explore", icon: Network },
  { name: "Dependencies", icon: Box },
  { name: "Functions", icon: Braces },
  { name: "Pipelines", icon: Workflow },
] as const;
export function App() {
  const state = useRepo(),
    {
      snapshot,
      view,
      layout,
      focus,
      set,
      query,
      selectedId,
      select,
      pending,
      error,
    } = state;
  const [repoForm, setRepoForm] = useState(false),
    [repository, setRepository] = useState(""),
    [branch, setBranch] = useState(""),
    [settings, setSettings] = useState(false),
    [help, setHelp] = useState(false),
    [ruleText, setRuleText] = useState(""),
    [dependencyLimit, setDependencyLimit] = useState(60);
  const health = useMemo(() => rateSnapshot(snapshot), [snapshot]),
    files = snapshot.nodes.filter((n) => n.kind === "file"),
    functions = snapshot.nodes.filter((n) => n.kind === "function"),
    matches = useMemo(
      () =>
        query.trim()
          ? snapshot.nodes
              .filter(
                (n) =>
                  (n.kind !== "package" &&
                    n.path.toLowerCase().includes(query.toLowerCase())) ||
                  (query.trim() &&
                    n.kind === "function" &&
                    n.name.toLowerCase().includes(query.toLowerCase())),
              )
              .slice(0, 12)
          : [],
      [snapshot, query],
    );
  const apiHealth = useQuery({
    queryKey: ["api-health"],
    queryFn: () => json<{ status: string }>("/api/health"),
    retry: false,
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        set({ focus: null, query: "" });
        setRepoForm(false);
        setSettings(false);
        setHelp(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("repo-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    const media = matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => set({ reducedMotion: media.matches });
    media.addEventListener("change", change);
    return () => {
      window.removeEventListener("keydown", handler);
      media.removeEventListener("change", change);
    };
  }, [set]);
  function submitRepo(e: React.FormEvent) {
    e.preventDefault();
    let input = repository
      .trim()
      .replace(/\.git\/?$/, "")
      .replace(/\/$/, "");
    if (input.startsWith("https://github.com/")) input = input.slice(19);
    if (
      !/^[A-Za-z0-9][A-Za-z0-9_-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(input)
    ) {
      set({ error: "Enter a public github.com/owner/repository URL." });
      return;
    }
    setRepoForm(false);
    void loadRepository(
      input,
      branch.trim() || undefined,
      branch.trim() || "main",
    );
  }
  const totalLOC = files.reduce((s, n) => s + n.loc, 0),
    format = (n: number) =>
      Intl.NumberFormat("en", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n);
  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="repo-view home"
        >
          <Network size={24} />
          <span>repo-view</span>
          <span className="brand-divider" />
          <small>See the shape of your code.</small>
        </a>
        <nav className="primary-nav" aria-label="Main views">
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={view === name ? "active" : ""}
              onClick={() => set({ view: name as View })}
            >
              <Icon size={14} />
              <span>{name}</span>
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <a
            className="icon-button github-button"
            href="https://github.com/Gaiser147/repo-view"
            target="_blank"
            rel="noreferrer"
            aria-label="Project on GitHub"
          >
            <Github size={18} />
          </a>
          <button
            className={`icon-button ${settings ? "active" : ""}`}
            aria-label="View settings"
            onClick={() => {
              setSettings(!settings);
              setRepoForm(false);
            }}
          >
            <Settings2 size={18} />
          </button>
          <span className="avatar">RV</span>
        </div>
      </header>
      <div className="repository-bar">
        <button
          className="icon-button"
          aria-label="Toggle files"
          onClick={() => set({ filesOpen: !state.filesOpen })}
        >
          <ListTree size={17} />
        </button>
        <button
          className="repository-button"
          aria-label="Open repository"
          onClick={() => {
            setRepoForm(!repoForm);
            setSettings(false);
          }}
        >
          <Github size={16} />
          <span className="repo-owner">
            {snapshot.repository.split("/")[0]}
            <span>/</span>
          </span>
          <b>{snapshot.repository.split("/")[1]}</b>
          <ChevronDown size={13} />
        </button>
        {snapshot.demo && <span className="demo-tag">DEMO DATA</span>}
        <div className="branch-indicator">
          <GitBranch size={13} />
          {state.branch}
        </div>
        <div className="search-wrap">
          <Search size={14} />
          <input
            id="repo-search"
            type="search"
            aria-label="Search repository"
            placeholder="Search files, functions…"
            value={query}
            onChange={(e) => set({ query: e.target.value })}
          />
          <kbd>
            <Command size={10} /> K
          </kbd>
          {query && (
            <div className="search-results">
              {matches.length ? (
                matches.map((n) => (
                  <button key={n.id} onClick={() => select(n.id)}>
                    <span>
                      {n.kind === "function" ? (
                        <Braces size={14} />
                      ) : (
                        <Box size={14} />
                      )}
                    </span>
                    <div>
                      {n.name}
                      <small>{n.path}</small>
                    </div>
                  </button>
                ))
              ) : (
                <p>No matching files or functions.</p>
              )}
            </div>
          )}
        </div>
        <button
          className="health-button"
          aria-label="Repository health"
          onClick={() => set({ inspector: "health" })}
        >
          <ShieldCheck size={15} />
          <span>Health</span>
          <b>
            {health.score ?? "—"}
            <small>/100</small>
          </b>
          <ChevronDown size={12} />
        </button>
      </div>
      {repoForm && (
        <form className="repo-form" onSubmit={submitRepo}>
          <div>
            <label htmlFor="repository-url">Repository URL</label>
            <input
              id="repository-url"
              autoFocus
              placeholder="https://github.com/owner/repository"
              value={repository}
              onChange={(e) => setRepository(e.target.value)}
            />
          </div>
          <div className="branch-field">
            <label htmlFor="branch-ref">Branch / ref (optional)</label>
            <input
              id="branch-ref"
              placeholder="Default branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </div>
          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? "Analyzing…" : "Analyze repository"}
            <ArrowUpRight size={15} />
          </button>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              openDemo();
              setRepoForm(false);
            }}
          >
            Open demo
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Close repository form"
            onClick={() => setRepoForm(false)}
          >
            <X size={16} />
          </button>
        </form>
      )}
      {settings && (
        <section className="settings-panel">
          <div className="panel-heading">
            VIEW SETTINGS
            <button
              className="icon-button"
              aria-label="Close settings"
              onClick={() => setSettings(false)}
            >
              <X size={15} />
            </button>
          </div>
          <label>
            Color by
            <select
              value={state.color}
              onChange={(e) =>
                set({ color: e.target.value as typeof state.color })
              }
            >
              <option value="module">Codebase group</option>
              <option value="complexity">Function complexity</option>
              <option value="language">Language</option>
              <option value="changes">Changes since previous snapshot</option>
            </select>
          </label>
          <label>
            Node size
            <select
              value={state.metric}
              onChange={(e) =>
                set({ metric: e.target.value as "loc" | "bytes" })
              }
            >
              <option value="loc">Lines of code</option>
              <option value="bytes">File size (bytes)</option>
            </select>
          </label>
          <label>
            <span>
              Performance mode
              <small>Disable bloom; reduce atmospheric particles</small>
            </span>
            <input
              type="checkbox"
              checked={state.lowPower}
              onChange={(e) => set({ lowPower: e.target.checked })}
            />
          </label>
          <label>
            <span>Reduced motion</span>
            <input
              type="checkbox"
              checked={state.reducedMotion}
              onChange={(e) => set({ reducedMotion: e.target.checked })}
            />
          </label>
          <div className="section-heading">LAYER ASSIGNMENTS</div>
          <p className="small muted">
            Assign groups or path globs to layers 0–3, in order. First matching
            rule wins. Other files stay visible in Unassigned.
          </p>
          <label>
            Group = layer, one per line
            <textarea
              placeholder={
                "apps/**=0\nservices/**=1\npackages/**=2\ninfra/**=3"
              }
              value={ruleText}
              onChange={(e) => setRuleText(e.target.value)}
            />
          </label>
          <button
            className="primary-button"
            onClick={() => {
              const rules: Record<string, string> = {};
              for (const line of ruleText.split("\n")) {
                const [g, i] = line.split("=").map((s) => s.trim());
                if (!g) continue;
                if (!/^[0-3]$/.test(i ?? "")) {
                  set({
                    error:
                      "Layer assignments use group=0, group=1, group=2 or group=3.",
                  });
                  return;
                }
                rules[g] = i;
              }
              set({ layerRules: rules });
              setSettings(false);
            }}
          >
            Apply layer assignments
            <Check size={14} />
          </button>
        </section>
      )}
      {error && (
        <div className="error-banner" role="alert">
          <Activity size={15} />
          <span>{error}</span>
          <button
            className="text-link"
            onClick={() => {
              set({ error: null });
              setRepoForm(true);
            }}
          >
            Choose repository
          </button>
          <button
            className="icon-button"
            aria-label="Dismiss error"
            onClick={() => set({ error: null })}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <main className="workbench">
        <Files />
        <section
          className={`graph-workspace ${view === "Pipelines" ? "pipeline-mode" : ""}`}
          aria-label="Spatial repository explorer"
        >
          <div className="workspace-heading">
            <div>
              <div className="workspace-breadcrumb">
                <span>{snapshot.repository.split("/")[1]}</span>
                <span>/</span>
                <span>{focus ?? "all modules"}</span>
              </div>
              <h1>Repository explorer</h1>
            </div>
            <div className="morph-control" aria-label="Spatial layout">
              <button
                aria-pressed={layout === "cloud"}
                className={layout === "cloud" ? "active" : ""}
                onClick={() => set({ layout: "cloud" })}
              >
                <Network size={15} />
                Cloud
              </button>
              <span className="morph-connector" />
              <button
                aria-pressed={layout === "layers"}
                className={layout === "layers" ? "active" : ""}
                onClick={() => set({ layout: "layers", focus: null })}
              >
                <Layers3 size={15} />
                Layers
              </button>
            </div>
            <div className="spatial-status">
              <i />
              {focus
                ? "Local focus"
                : layout === "layers"
                  ? "Layered architecture"
                  : "Spatial overview"}
            </div>
          </div>
          <div className="graph-canvas">
            <Suspense
              fallback={
                <div className="graph-fallback">Loading spatial engine…</div>
              }
            >
              <Graph />
            </Suspense>
          </div>
          {files.length === 0 && (
            <div className="empty-state">
              <Cuboid size={36} />
              <h2>This repository has room to grow.</h2>
              <p>
                No source files at this commit. Choose another repository or
                explore the interactive demo.
              </p>
              <button className="primary-button" onClick={openDemo}>
                Explore demo
                <ArrowUpRight size={15} />
              </button>
            </div>
          )}
          {pending && (
            <div className="loading-overlay" role="status">
              <LoaderCircle className="spin" size={17} />
              <span>
                {state.progress}
                <small>
                  Current snapshot stays visible until the next one is ready.
                </small>
              </span>
            </div>
          )}
          {focus && (
            <button
              className="exit-focus"
              aria-label="Exit focus"
              onClick={() => set({ focus: null })}
            >
              <Focus size={14} />
              {focus}
              <span>Exit focus</span>
              <kbd>Esc</kbd>
            </button>
          )}
          {view === "Dependencies" && (
            <div className="context-panel scroll-area">
              <div className="section-heading">
                EXTERNAL PACKAGES <span>{snapshot.dependencies.length}</span>
              </div>
              {snapshot.dependencies.slice(0, dependencyLimit).map((d, i) => (
                <div className="dependency" key={d.name + i}>
                  <Box size={13} />
                  <span>
                    {d.name}
                    <small>{d.dev ? "development" : "production"}</small>
                  </span>
                  <code>{d.version}</code>
                </div>
              ))}
              {snapshot.dependencies.length > dependencyLimit && (
                <button
                  className="text-link list-more"
                  onClick={() => setDependencyLimit(dependencyLimit + 60)}
                >
                  Show 60 more ({snapshot.dependencies.length - dependencyLimit}{" "}
                  remaining)
                </button>
              )}
              {!snapshot.dependencies.length && (
                <p className="muted small">
                  No package.json dependencies found.
                </p>
              )}
            </div>
          )}
          {view === "Functions" && (
            <div className="context-note">
              <Braces size={15} />
              <span>
                {functions.length} function definitions
                <small>
                  Zoom closer to reveal functions. Select a file to inspect its
                  definitions.
                </small>
              </span>
            </div>
          )}
          {view === "Pipelines" && <PipelineDetail />}
          <div className="graph-bottom">
            <div className="legend">
              <span>
                <i className="dot cyan" />
                {state.color === "module"
                  ? "File / module"
                  : state.color === "complexity"
                    ? "Blue ≤10 · amber >10"
                    : state.color === "language"
                      ? "Blue TS · gold JS · mint other"
                      : "Mint: added / changed"}
              </span>
              <span>
                <i className="dot mint" />
                Selected element
              </span>
              <span>
                <i className="legend-line" />
                Resolved connection
              </span>
              <small>
                Size ∝ {state.metric === "loc" ? "lines of code" : "bytes"} ·
                glow is decorative
              </small>
            </div>
            <div className="graph-tools">
              <button
                className="icon-button"
                aria-label={
                  state.paused ? "Resume animation" : "Pause animation"
                }
                onClick={() => set({ paused: !state.paused })}
              >
                {state.paused ? <Play size={15} /> : <Pause size={15} />}
              </button>
              <span />
              <button
                className="icon-button"
                aria-label="Reset camera"
                title="Reset camera"
                onClick={() =>
                  set({ cameraRevision: state.cameraRevision + 1 })
                }
              >
                <Maximize2 size={15} />
              </button>
              <button
                className="icon-button"
                aria-label="Graph help"
                onClick={() => setHelp(!help)}
              >
                <CircleHelp size={15} />
              </button>
            </div>
          </div>
          {help && (
            <div className="help-panel">
              <b>Explore in three dimensions</b>
              <p>Drag to orbit · scroll to zoom · right-drag to pan.</p>
              <p>
                Click a point or file to inspect. Unfold a group with Focus.
                Switch Cloud / Layers to reorganize the same code.
              </p>
              <button className="text-link" onClick={() => setHelp(false)}>
                Got it
              </button>
            </div>
          )}
        </section>
        <Inspector />
      </main>
      <Timeline />
      <PipelineStrip />
      <footer className="statusbar">
        <div>
          <span
            className={`connection-dot ${apiHealth.isError ? "offline" : ""}`}
          />
          {snapshot.demo
            ? "Demo workspace"
            : pending
              ? "Analyzing repository"
              : "Repository loaded"}
          <span className="footer-divider" />
          {format(files.length)} files<span>·</span>
          {format(totalLOC)} LOC<span>·</span>
          {format(functions.length)} functions
        </div>
        <div>
          {snapshot.coverage.partial ? (
            <span className="amber">Partial analysis</span>
          ) : (
            <span>
              {Math.round(
                snapshot.coverage.total
                  ? (snapshot.coverage.analyzed / snapshot.coverage.total) * 100
                  : 0,
              )}
              % text coverage
            </span>
          )}
          <span className="footer-divider" />
          {state.lowPower ? (
            <>
              <Zap size={11} />
              Performance mode
            </>
          ) : (
            <>
              <Cuboid size={11} />
              WebGL spatial engine
            </>
          )}
          <span className="footer-divider" />
          <kbd>⌘ K</kbd>
          <span>Search</span>
        </div>
      </footer>
    </div>
  );
}
