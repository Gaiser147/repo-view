import { ApiAllowance } from "./ExplorationControls";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  LoaderCircle,
  X,
} from "lucide-react";
import type { Commit } from "../../../packages/core/src/index";
import {
  useRepo,
  loadCommit,
  loadOlderCommits,
  compareCommits,
  clearCompare,
} from "./state";

const short = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
const compact = (n: number) =>
  Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

/** Commit positions follow real elapsed time, so a quiet month looks quiet. Out-of-order dates never move a commit backwards. */
function positions(commits: Commit[]) {
  let latest = -Infinity;
  const times = commits.map((c) => {
      const t = Date.parse(c.date);
      latest = Number.isFinite(t) ? Math.max(latest, t) : latest;
      return Number.isFinite(latest) ? latest : 0;
    }),
    first = times[0] ?? 0,
    span = (times.at(-1) ?? 0) - first;
  // Mostly elapsed time, with a small even share so commits made minutes apart stay separately clickable.
  const step = commits.length > 1 ? 1 / (commits.length - 1) : 0;
  return times.map((t, i) =>
    commits.length < 2
      ? 0.5
      : (span > 0 ? ((t - first) / span) * 0.8 : i * step * 0.8) +
        i * step * 0.2,
  );
}

export function Timeline() {
  const {
    snapshot,
    commits,
    playing,
    pending,
    branch,
    set,
    historyOpen,
    cacheStatus,
    cachedCommits,
    compareBase,
    history,
  } = useRepo();
  const chronological = useMemo(() => [...commits].reverse(), [commits]),
    xs = useMemo(() => positions(chronological), [chronological]),
    index = chronological.findIndex((c) => c.sha === snapshot.sha),
    commit = chronological[index],
    baseIndex = compareBase
      ? chronological.findIndex((c) => c.sha === compareBase)
      : -1;
  const [olderLoading, setOlderLoading] = useState(false),
    [hover, setHover] = useState<number | null>(null),
    [drag, setDrag] = useState<{ from: number; to: number } | null>(null),
    track = useRef<HTMLDivElement>(null),
    pointer = useRef<{ x: number; index: number; moved: boolean } | null>(null);
  useEffect(() => {
    if (!playing || pending) return;
    const timer = setTimeout(() => {
      if (index >= chronological.length - 1) {
        set({ playing: false });
        return;
      }
      void loadCommit(chronological[index + 1].sha);
    }, 1400);
    return () => clearTimeout(timer);
  }, [playing, pending, index, snapshot.sha]);
  const [scrub, setScrub] = useState(0),
    scrubTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => setScrub(Math.max(0, index)), [index]);
  useEffect(() => () => clearTimeout(scrubTimer.current), []);
  const open = (i: number) => {
    set({ playing: false });
    const c = chronological[i];
    if (c) void loadCommit(c.sha);
  };
  const nearest = (clientX: number) => {
    const rect = track.current!.getBoundingClientRect(),
      t = (clientX - rect.left) / Math.max(1, rect.width);
    let best = 0;
    xs.forEach((x, i) => {
      if (Math.abs(x - t) < Math.abs(xs[best] - t)) best = i;
    });
    return best;
  };
  async function older() {
    setOlderLoading(true);
    try {
      await loadOlderCommits();
    } finally {
      setOlderLoading(false);
    }
  }
  // Lines of code over time, drawn only through commits whose snapshot is known.
  const loc = chronological
      .map((c, i) => ({ i, v: history?.loc.get(c.sha) }))
      .filter((p): p is { i: number; v: number } => p.v !== undefined),
    max = Math.max(1, ...loc.map((p) => p.v)),
    min = Math.min(max, ...loc.map((p) => p.v)),
    y = (v: number) => (max === min ? 50 : 86 - ((v - min) / (max - min)) * 70),
    path = loc
      .map(
        (p, k) =>
          `${k ? "L" : "M"}${(xs[p.i] * 1000).toFixed(1)} ${y(p.v).toFixed(1)}`,
      )
      .join(" "),
    counts = [...(history?.changedPerCommit.values() ?? [])].sort(
      (a, b) => b - a,
    ),
    large = counts[Math.floor(counts.length * 0.15)] ?? Infinity;
  const band = drag
    ? [Math.min(drag.from, drag.to), Math.max(drag.from, drag.to)]
    : baseIndex >= 0 && index >= 0
      ? [Math.min(baseIndex, index), Math.max(baseIndex, index)]
      : null;
  const titleBlock = (
    <div className="title-block" aria-label="Selected revision">
      <div className="tb-sheet">
        <span className="tb-label">Sheet</span>
        <b>
          {commit?.message ??
            (snapshot.sha === "empty"
              ? "Empty repository"
              : "Selected snapshot")}
        </b>
      </div>
      <div>
        <span className="tb-label">Revision</span>
        <code>
          {compareBase && (
            <>
              <span className="tb-base">{compareBase.slice(0, 7)}</span>
              {" → "}
            </>
          )}
          <span data-testid="commit-sha">{snapshot.sha.slice(0, 7)}</span>
        </code>
      </div>
      <div>
        <span className="tb-label">Drawn by</span>
        <span>{commit?.author ?? "Unknown"}</span>
      </div>
      <div>
        <span className="tb-label">Date</span>
        <span>
          {commit
            ? new Date(commit.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "—"}
        </span>
      </div>
      <div>
        <span className="tb-label">No.</span>
        <span className="tb-mono">
          {index >= 0 ? index + 1 : "—"} / {chronological.length} · {branch}
        </span>
      </div>
    </div>
  );
  if (!historyOpen)
    return (
      <section className="time-spine collapsed" aria-label="Revision bar">
        <button
          className="spine-toggle"
          aria-label="Show history"
          aria-expanded={false}
          onClick={() => set({ historyOpen: true })}
        >
          <ChevronUp size={16} />
          History
        </button>
        <code data-testid="commit-sha">{snapshot.sha.slice(0, 7)}</code>
        <span className="spine-caption">{commit?.message}</span>
      </section>
    );
  return (
    <section className="time-spine" aria-label="Commit history">
      <div className="spine-main">
        <div className="spine-controls">
          <button
            className={`icon-button play-button ${playing ? "active" : ""}`}
            aria-label={playing ? "Pause history" : "Play history"}
            disabled={!commits.length || (pending && !playing)}
            onClick={() => {
              if (index === chronological.length - 1 && chronological.length)
                void loadCommit(chronological[0].sha);
              set({ playing: !playing });
            }}
          >
            {pending ? (
              <LoaderCircle size={16} className="spin" />
            ) : playing ? (
              <Pause size={16} />
            ) : (
              <Play size={16} />
            )}
          </button>
          <button
            className="icon-button"
            aria-label="Previous commit"
            disabled={index <= 0}
            onClick={() => open(index - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Next commit"
            disabled={index < 0 || index >= chronological.length - 1}
            onClick={() => open(index + 1)}
          >
            <ChevronRight size={16} />
          </button>
          <b className="spine-title">History</b>
          <span className="spine-rev">
            <code>{snapshot.sha.slice(0, 7)}</code>
            {commit?.message}
          </span>
          <span className="spine-meta">
            {chronological.length} commits
            {snapshot.demo && <span className="demo-tag">Demo</span>}
          </span>
          <span
            className={`cache-indicator ${cacheStatus}`}
            title="Commits already opened or prepared in the background open instantly and feed Hotspots and Authors."
          >
            {cacheStatus === "warming"
              ? "Preparing nearby commit…"
              : cacheStatus === "paused"
                ? `Cache paused · ${cachedCommits} ready`
                : `${cachedCommits} ${cachedCommits === 1 ? "commit" : "commits"} ready offline`}
          </span>
          <ApiAllowance />
          <span className="spine-hint">
            {compareBase ? (
              <button className="text-link" onClick={clearCompare}>
                <X size={13} /> Clear comparison
              </button>
            ) : (
              "Click a commit to open it · drag across commits to compare"
            )}
          </span>
          {!snapshot.demo && (
            <button
              className="text-link"
              disabled={olderLoading}
              onClick={older}
            >
              {olderLoading ? "Loading…" : "Load older"}
            </button>
          )}
          <button
            className="icon-button"
            aria-label="Hide history"
            aria-expanded
            onClick={() => set({ historyOpen: false })}
          >
            <ChevronDown size={16} />
          </button>
        </div>
        <div
          className={`spine-track ${drag ? "dragging" : ""}`}
          ref={track}
          data-hint="history"
          onPointerDown={(e) => {
            if (e.button > 0 || !chronological.length) return;
            const i = nearest(e.clientX);
            pointer.current = { x: e.clientX, index: i, moved: false };
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            const p = pointer.current;
            if (!chronological.length) return;
            const i = nearest(e.clientX);
            if (!p) {
              setHover(i);
              return;
            }
            if (!p.moved && Math.abs(e.clientX - p.x) > 6) p.moved = true;
            if (p.moved) setDrag({ from: p.index, to: i });
          }}
          onPointerLeave={() => !pointer.current && setHover(null)}
          onPointerUp={(e) => {
            const p = pointer.current;
            pointer.current = null;
            setDrag(null);
            if (!p) return;
            const i = nearest(e.clientX);
            if (p.moved && i !== p.index)
              void compareCommits(
                chronological[p.index].sha,
                chronological[i].sha,
              );
            else if (e.shiftKey && index >= 0 && i !== index)
              void compareCommits(
                chronological[index].sha,
                chronological[i].sha,
              );
            else open(i);
          }}
          onPointerCancel={() => {
            pointer.current = null;
            setDrag(null);
          }}
        >
          <svg
            className="spine-chart"
            viewBox="0 0 1000 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line x1="0" x2="1000" y1="16" y2="16" />
            <line x1="0" x2="1000" y1="51" y2="51" />
            <line x1="0" x2="1000" y1="86" y2="86" />
            {band && (
              <rect
                className="spine-band"
                x={xs[band[0]] * 1000}
                width={Math.max(2, (xs[band[1]] - xs[band[0]]) * 1000)}
                y="0"
                height="100"
              />
            )}
            {path && <path className="spine-loc" d={path} />}
          </svg>
          {chronological.map((c, i) => {
            const changed = history?.changedPerCommit.get(c.sha);
            return (
              <button
                key={c.sha}
                className={`commit-tick ${index === i ? "current" : ""} ${baseIndex === i ? "base" : ""} ${changed !== undefined && changed >= large && changed > 0 ? "large" : ""}`}
                style={{ left: `${xs[i] * 100}%` }}
                aria-label={`Commit ${c.sha.slice(0, 7)}: ${c.message}`}
                aria-pressed={index === i}
                onClick={(e) => {
                  if (e.detail === 0) open(i);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.shiftKey && index >= 0) {
                    e.preventDefault();
                    void compareCommits(chronological[index].sha, c.sha);
                  }
                }}
              >
                <i />
              </button>
            );
          })}
          {(drag || hover !== null) && chronological[drag?.to ?? hover!] && (
            <div
              className="commit-tooltip"
              style={{ left: `${xs[drag?.to ?? hover!] * 100}%` }}
            >
              <code>{chronological[drag?.to ?? hover!].sha.slice(0, 7)}</code>
              <span>{chronological[drag?.to ?? hover!].message}</span>
              <small>
                {drag
                  ? `Release to compare with ${chronological[drag.from].sha.slice(0, 7)}`
                  : `${short(chronological[hover!].date)} · ${chronological[hover!].author}${history?.changedPerCommit.has(chronological[hover!].sha) ? ` · ${history.changedPerCommit.get(chronological[hover!].sha)} files` : ""}`}
              </small>
            </div>
          )}
        </div>
        <input
          className="history-slider"
          type="range"
          aria-label="Commit position"
          min={0}
          max={Math.max(0, chronological.length - 1)}
          value={scrub}
          disabled={!chronological.length}
          onChange={(e) => {
            const i = Number(e.target.value);
            setScrub(i);
            clearTimeout(scrubTimer.current);
            scrubTimer.current = setTimeout(() => open(i), 250);
          }}
        />
        <div className="spine-scale">
          <span>{chronological[0] && short(chronological[0].date)}</span>
          <span>
            {loc.length > 1
              ? `LOC ${compact(loc[0].v)} → ${compact(loc.at(-1)!.v)} · known for ${loc.length} of ${chronological.length} commits`
              : "Line of code history appears as commits are opened"}
            <span className="legend-delta">
              <svg width="10" height="9" viewBox="0 0 10 9" aria-hidden="true">
                <path d="M5 0 10 9H0Z" />
              </svg>
              large change
            </span>
          </span>
          <span>
            {chronological.at(-1) && short(chronological.at(-1)!.date)}
          </span>
        </div>
      </div>
      {titleBlock}
    </section>
  );
}
