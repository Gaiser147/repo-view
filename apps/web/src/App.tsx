import { BranchSwitcher } from "./ExplorationControls";
import { AnalysisWorkspace } from "./Workspaces";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ChevronDown,
  CircleHelp,
  Crosshair,
  Cuboid,
  Download,
  Focus,
  GitFork,
  Link2,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Moon,
  Pause,
  Play,
  Settings2,
  ShieldCheck,
  Sun,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { rateSnapshot } from "../../../packages/core/src/health";
import {
  useRepo,
  openDemo,
  scheduleWarmup,
  stopWarmup,
  refreshHistory,
  diffWithParent,
  lenses,
  store,
} from "./state";
import { Files, Inspector } from "./Panels";
import { Timeline } from "./Timeline";
import { LensBar, LensCard } from "./Lens";
import { CommandPalette, type PaletteAction } from "./CommandPalette";
import { StartScreen, rememberRepository } from "./StartScreen";
import { Hints } from "./Hints";
import { HoverCard } from "./HoverCard";
import { readUrl, shareUrl, writeUrl } from "./url-state";
import { exportPng } from "./export-png";
import { inks } from "./colors";
const Graph = lazy(() => import("./Graph").then((m) => ({ default: m.Graph })));

export function App() {
  const root = useRef<HTMLDivElement>(null);
  async function fullscreen() {
    const s = useRepo.getState(),
      next = !s.expanded;
    s.toggleExpanded(next);
    try {
      if (next && root.current?.requestFullscreen)
        await root.current.requestFullscreen();
      else if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* The expanded layout also works when native fullscreen is unavailable. */
    }
  }
  useEffect(() => {
    let native = false;
    const change = () => {
      if (document.fullscreenElement === root.current) native = true;
      else if (native) {
        native = false;
        useRepo.getState().toggleExpanded(false);
      }
    };
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  const state = useRepo(),
    { snapshot, view, focus, set, pending, error, theme, started, toast } =
      state;
  const [picker, setPicker] = useState(!started),
    [settings, setSettings] = useState(false),
    [ruleText, setRuleText] = useState("");
  const health = useMemo(() => rateSnapshot(snapshot), [snapshot]);
  const notify = (message: string) => {
    set({ toast: message });
    setTimeout(() => {
      if (useRepo.getState().toast === message) set({ toast: null });
    }, 2600);
  };
  async function share() {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      notify("Link copied. It opens this exact view.");
    } catch {
      notify(url);
    }
  }
  async function exportImage() {
    try {
      await exportPng();
      notify("PNG exported with its title block.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Export failed.");
    }
  }
  const toggleTheme = () => {
    const next =
      useRepo.getState().theme === "cyanotype" ? "whiteprint" : "cyanotype";
    set({ theme: next });
    store("repo-view:theme", next);
  };
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", inks[theme].ground);
  }, [theme]);
  // Restore a shared view once, then keep the address in step with what is on screen.
  useEffect(() => {
    void readUrl().then((found) => {
      if (found) {
        set({ started: true });
        setPicker(false);
      }
    });
    let timer: ReturnType<typeof setTimeout>;
    const unsubscribe = useRepo.subscribe((s, p) => {
      if (
        s.snapshot !== p.snapshot ||
        s.lens !== p.lens ||
        s.layout !== p.layout ||
        s.selectedId !== p.selectedId ||
        s.compareBase !== p.compareBase ||
        s.focus !== p.focus ||
        s.started !== p.started
      ) {
        clearTimeout(timer);
        timer = setTimeout(writeUrl, 250);
      }
      if (s.snapshot.repository !== p.snapshot.repository && !s.snapshot.demo)
        rememberRepository(s.snapshot.repository);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    void refreshHistory();
    if (useRepo.getState().lens === "evolution") void diffWithParent();
  }, [snapshot.repository, snapshot.sha, state.commits, state.cachedCommits]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
      const editable = (e.target as HTMLElement)?.matches?.(
        "input,textarea,select,[contenteditable=true]",
      );
      if (e.key === "Escape") {
        const current = useRepo.getState();
        setSettings(false);
        if (!current.started) return;
        if (picker) setPicker(false);
        else if (current.expanded) void fullscreen();
        else if (current.focus) current.set({ focus: null });
        else if (current.view !== "Explore") current.toggleView("Explore");
        else if (current.filesOpen && innerWidth < 1200)
          current.set({ filesOpen: false });
        else current.set({ inspectorOpen: false, selectedId: null });
        return;
      }
      if (editable || !plain) return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        useRepo.getState().requestCamera("in");
      } else if (e.key === "-") {
        e.preventDefault();
        useRepo.getState().requestCamera("out");
      } else if (e.key === "0") useRepo.getState().requestCamera("fit");
      else if (e.key.toLowerCase() === "f") void fullscreen();
      else if (/^[1-6]$/.test(e.key))
        useRepo.getState().setLens(lenses[Number(e.key) - 1].id);
    };
    window.addEventListener("keydown", handler);
    const media = matchMedia("(prefers-reduced-motion: reduce)"),
      change = () => set({ reducedMotion: media.matches });
    media.addEventListener("change", change);
    return () => {
      window.removeEventListener("keydown", handler);
      media.removeEventListener("change", change);
    };
  }, [set, picker]);
  useEffect(() => {
    scheduleWarmup();
    const visibility = () => {
      if (document.hidden) stopWarmup();
      else scheduleWarmup();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      stopWarmup();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [
    snapshot.repository,
    snapshot.sha,
    state.prefetchEnabled,
    state.pending,
    state.playing,
  ]);
  const actions: PaletteAction[] = [
    {
      id: "open",
      label: "Open another repository",
      run: () => setPicker(true),
    },
    { id: "cloud", label: "Cloud layout", run: () => set({ layout: "cloud" }) },
    {
      id: "layers",
      label: "Layers layout",
      run: () => set({ layout: "layers" }),
    },
    {
      id: "fit",
      label: "Fit drawing",
      hint: "0",
      run: () => state.requestCamera("fit"),
    },
    {
      id: "full",
      label: "Fullscreen",
      hint: "F",
      run: () => void fullscreen(),
    },
    { id: "files", label: "Show files", run: () => set({ filesOpen: true }) },
    {
      id: "health",
      label: "Repository health",
      run: () => set({ inspector: "health", inspectorOpen: true }),
    },
    { id: "share", label: "Copy link to this view", run: () => void share() },
    { id: "png", label: "Export PNG", run: () => void exportImage() },
    {
      id: "theme",
      label:
        theme === "cyanotype"
          ? "Switch to whiteprint (light)"
          : "Switch to cyanotype (dark)",
      run: toggleTheme,
    },
    {
      id: "power",
      label: state.lowPower
        ? "Turn off performance mode"
        : "Turn on performance mode",
      run: () => set({ lowPower: !state.lowPower }),
    },
    {
      id: "tips",
      label: "Show tips again",
      run: () => dispatchEvent(new Event("repo-view:hints")),
    },
  ];
  const [owner, name] = snapshot.repository.split("/");
  return (
    <div
      ref={root}
      className={`app-shell ${state.expanded ? "is-expanded" : ""} view-${view.toLowerCase()}`}
    >
      <header className="topbar">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="repo-view home"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <circle cx="11" cy="11" r="8.5" />
            <path d="M1.5 11h19M11 1.5v19" />
          </svg>
          <span>repo-view</span>
        </a>
        <button
          className="repository-button"
          aria-label="Open repository"
          onClick={() => setPicker(true)}
        >
          <GitFork size={15} strokeWidth={1.6} />
          <span className="repo-owner">{owner} /</span>
          <b>{name}</b>
          <ChevronDown size={13} />
        </button>
        <BranchSwitcher />
        {snapshot.demo && <span className="demo-tag">Demo data</span>}
        <CommandPalette actions={actions} />
        <div className="header-actions">
          <button
            className="health-button"
            aria-label="Repository health"
            title="Health: evidence-based structural score"
            onClick={() =>
              set({
                inspector: "health",
                inspectorOpen: true,
                ...(innerWidth < 1200 ? { filesOpen: false } : {}),
              })
            }
          >
            <ShieldCheck size={15} strokeWidth={1.6} />
            <span className="health-word">Health</span>
            <b>{health.score ?? "—"}</b>
            <small>/100</small>
          </button>
          <button
            className="tool-button"
            onClick={() => void exportImage()}
            title="Export the drawing as PNG"
          >
            <Download size={15} strokeWidth={1.6} />
            <span>Export</span>
          </button>
          <button
            className="tool-button"
            onClick={() => void share()}
            title="Copy a link to this exact view"
          >
            <Link2 size={15} strokeWidth={1.6} />
            <span>Share</span>
          </button>
          <button
            className="icon-button"
            aria-label={
              theme === "cyanotype"
                ? "Switch to light whiteprint"
                : "Switch to dark cyanotype"
            }
            title={
              theme === "cyanotype" ? "Whiteprint (light)" : "Cyanotype (dark)"
            }
            onClick={toggleTheme}
          >
            {theme === "cyanotype" ? (
              <Sun size={16} strokeWidth={1.6} />
            ) : (
              <Moon size={16} strokeWidth={1.6} />
            )}
          </button>
          <button
            className={`icon-button ${settings ? "active" : ""}`}
            aria-label="View settings"
            aria-expanded={settings}
            onClick={() => setSettings(!settings)}
          >
            <Settings2 size={16} strokeWidth={1.6} />
          </button>
        </div>
      </header>
      <LensBar />
      {settings && (
        <section className="settings-panel" aria-label="View settings">
          <div className="panel-heading">
            <span>View settings</span>
            <button
              className="icon-button"
              aria-label="Close settings"
              onClick={() => setSettings(false)}
            >
              <X size={15} />
            </button>
          </div>
          <label>
            Print
            <select
              value={theme}
              onChange={(e) => {
                set({ theme: e.target.value as typeof theme });
                store("repo-view:theme", e.target.value);
              }}
            >
              <option value="cyanotype">Cyanotype (dark)</option>
              <option value="whiteprint">Whiteprint (light)</option>
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
          <label className="check">
            <span>
              Performance mode
              <small>Plainer rendering at device pixel ratio 1</small>
            </span>
            <input
              type="checkbox"
              checked={state.lowPower}
              onChange={(e) => set({ lowPower: e.target.checked })}
            />
          </label>
          <label className="check">
            <span>Reduced motion</span>
            <input
              type="checkbox"
              checked={state.reducedMotion}
              onChange={(e) => set({ reducedMotion: e.target.checked })}
            />
          </label>
          <label className="check">
            <span>
              Prepare nearby commits
              <small>Paced background cache · up to 6 attempts per hour</small>
            </span>
            <input
              type="checkbox"
              checked={state.prefetchEnabled}
              onChange={(e) => set({ prefetchEnabled: e.target.checked })}
            />
          </label>
          <div className="section-heading">Layer assignments</div>
          <p className="small muted">
            Assign groups or path globs to layers 0–3, in order. The first
            matching rule wins. Other files stay visible in Unassigned.
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
              set({ layerRules: rules, layout: "layers" });
              setSettings(false);
            }}
          >
            Apply layer assignments
          </button>
          <button
            className="text-link"
            onClick={() => dispatchEvent(new Event("repo-view:hints"))}
          >
            Show tips again
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
              setPicker(true);
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
          className="graph-workspace"
          hidden={view !== "Explore"}
          aria-label="Spatial repository explorer"
        >
          <h1 className="visually-hidden">Repository explorer</h1>
          <div className="graph-canvas" data-hint="graph">
            <Suspense
              fallback={
                <div className="graph-fallback">Loading spatial engine…</div>
              }
            >
              <Graph />
            </Suspense>
          </div>
          <LensCard />
          <HoverCard />
          {snapshot.nodes.every((n) => n.kind !== "file") && (
            <div className="empty-state">
              <Cuboid size={32} strokeWidth={1.4} />
              <h2>No source files at this commit</h2>
              <p>
                Pick another commit in the history, open another repository or
                explore the demo.
              </p>
              <button className="primary-button" onClick={openDemo}>
                Explore demo
                <ArrowRight size={15} />
              </button>
            </div>
          )}
          {pending && (
            <div className="loading-overlay" role="status">
              <LoaderCircle className="spin" size={16} />
              <span>
                {state.progress}
                <small>
                  The current revision stays on screen until the next one is
                  ready.
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
          <div className="detail-level" data-testid="graph-detail">
            {state.graphLevel === "packages"
              ? "Packages"
              : state.graphLevel === "functions"
                ? "Functions"
                : "Files"}
            <span>
              {state.graphLevel === "functions"
                ? " · click a label or point"
                : " · zoom in for more detail"}
            </span>
          </div>
          <div className="graph-tools" aria-label="Camera">
            <button
              className="icon-button"
              aria-label="Zoom in"
              title="Zoom in (+)"
              onClick={() => state.requestCamera("in")}
            >
              <ZoomIn size={17} strokeWidth={1.6} />
            </button>
            <button
              className="icon-button"
              aria-label="Zoom out"
              title="Zoom out (−)"
              onClick={() => state.requestCamera("out")}
            >
              <ZoomOut size={17} strokeWidth={1.6} />
            </button>
            <button
              className="icon-button"
              aria-label="Reset camera"
              title="Fit drawing (0)"
              onClick={() => state.requestCamera("fit")}
            >
              <Crosshair size={17} strokeWidth={1.6} />
            </button>
            <button
              className="icon-button"
              aria-label={state.expanded ? "Exit fullscreen" : "Expand cloud"}
              title="Fullscreen (F)"
              onClick={() => void fullscreen()}
            >
              {state.expanded ? (
                <Minimize2 size={17} strokeWidth={1.6} />
              ) : (
                <Maximize2 size={17} strokeWidth={1.6} />
              )}
            </button>
            <button
              className="icon-button"
              aria-label={state.paused ? "Resume animation" : "Pause animation"}
              onClick={() => set({ paused: !state.paused })}
            >
              {state.paused ? (
                <Play size={15} strokeWidth={1.6} />
              ) : (
                <Pause size={15} strokeWidth={1.6} />
              )}
            </button>
            <button
              className="icon-button"
              aria-label="Graph help"
              title="Show tips again"
              onClick={() => dispatchEvent(new Event("repo-view:hints"))}
            >
              <CircleHelp size={16} strokeWidth={1.6} />
            </button>
          </div>
        </section>
        <AnalysisWorkspace />
        <Inspector />
        {picker && <StartScreen onClose={() => setPicker(false)} />}
      </main>
      <Timeline />
      <Hints />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
