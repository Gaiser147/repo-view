import { useMemo, useState, useEffect } from "react";
import {
  ChevronRight,
  FileCode2,
  Folder,
  Focus,
  X,
  ArrowUpRight,
  GitBranch,
  ShieldCheck,
  ExternalLink,
  CircleAlert,
  Box,
  Braces,
} from "lucide-react";
import type { CodeNode } from "../../../packages/core/src/index";
import { rateSnapshot } from "../../../packages/core/src/health";
import { groupColor } from "./colors";
import { useRepo } from "./state";
const number = (n: number) =>
  new Intl.NumberFormat("en", {
    notation: n > 9999 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);
interface Tree {
  name: string;
  path: string;
  children: Map<string, Tree>;
  node?: CodeNode;
}
function Branch({ tree, level = 0 }: { tree: Tree; level?: number }) {
  const { selectedId, select } = useRepo();
  if (tree.node)
    return (
      <button
        className={`tree-file ${selectedId === tree.node.id ? "selected" : ""}`}
        style={{ paddingLeft: 12 + level * 13 }}
        title={tree.path}
        onClick={() => select(tree.node!.id)}
      >
        <FileCode2 size={13} />
        <span>{tree.name}</span>
      </button>
    );
  return (
    <details className="tree-folder" open={level < 1}>
      <summary style={{ paddingLeft: 10 + level * 13 }}>
        <ChevronRight size={12} />
        <Folder size={13} />
        <span>{tree.name}</span>
      </summary>
      {[...tree.children.values()]
        .sort(
          (a, b) =>
            Number(!!a.node) - Number(!!b.node) || a.name.localeCompare(b.name),
        )
        .map((child) => (
          <Branch key={child.path} tree={child} level={level + 1} />
        ))}
    </details>
  );
}
export function Files() {
  const { snapshot, filesOpen, focus, layout, set } = useRepo();
  const groups = snapshot.nodes.filter((n) => n.kind === "package");
  const trees = useMemo(() => {
    const root: Tree = { name: "root", path: "", children: new Map() };
    for (const node of snapshot.nodes.filter((n) => n.kind === "file")) {
      let t = root;
      const parts = node.path.split("/");
      parts.forEach((name, i) => {
        if (!t.children.has(name))
          t.children.set(name, {
            name,
            path: parts.slice(0, i + 1).join("/"),
            children: new Map(),
          });
        t = t.children.get(name)!;
        if (i === parts.length - 1) t.node = node;
      });
    }
    return [...root.children.values()];
  }, [snapshot]);
  if (!filesOpen) return null;
  return (
    <aside className="files-panel" aria-label="Files">
      <div className="panel-heading">
        <span>EXPLORER</span>
        <span className="subtle">
          {snapshot.nodes.filter((n) => n.kind === "file").length}
        </span>
        <button
          className="icon-button"
          aria-label="Close files"
          onClick={() => set({ filesOpen: false })}
        >
          <X size={15} />
        </button>
      </div>
      <div className="repo-tree scroll-area">
        {trees.map((t) => (
          <Branch key={t.path} tree={t} />
        ))}
      </div>
      <div className="package-focus">
        <div className="panel-heading">SPATIAL GROUPS</div>
        {groups.map((p) => (
          <div key={p.id} className="group-row">
            <button onClick={() => useRepo.getState().select(p.id)}>
              <i
                style={{
                  background: groupColor(
                    p.group,
                    groups.map((g) => g.group),
                  ),
                }}
              />
              {p.name}
            </button>
            <button
              className={`icon-button ${focus === p.group ? "active" : ""}`}
              title={
                layout === "layers"
                  ? "Switch to Cloud to unfold locally"
                  : "Unfold this group"
              }
              disabled={layout === "layers"}
              aria-label={`Focus ${p.group}`}
              onClick={() => set({ focus: focus === p.group ? null : p.group })}
            >
              <Focus size={14} />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
function Health() {
  const snapshot = useRepo((s) => s.snapshot),
    health = useMemo(() => rateSnapshot(snapshot), [snapshot]);
  return (
    <>
      <div className="inspector-title">
        <ShieldCheck size={20} />
        <h2>Repository health</h2>
      </div>
      <div className="health-total">
        <strong>{health.score ?? "—"}</strong>
        <span>/ 100</span>
        <small>
          {snapshot.demo
            ? "Illustrative demo analysis"
            : "Static analysis heuristic"}
        </small>
      </div>
      <p className="muted small">
        {health.score === null
          ? "Overall score requires all categories and at least 80% analysis coverage."
          : "A structural signal. Open each rule to see the evidence."}
      </p>
      {health.categories.map((c) => (
        <div className="health-category" key={c.name}>
          <div>
            <span>{c.name}</span>
            <b>{c.score ?? "Not assessed"}</b>
          </div>
          <div className="bar">
            <i style={{ width: `${c.score ?? 0}%` }} />
          </div>
          <details>
            <summary>Method · {Math.round(c.weight * 100)}% weight</summary>
            <p>{c.reason}</p>
          </details>
        </div>
      ))}
      <div className="section-heading">
        EVIDENCE <span>{health.findings.length}</span>
      </div>
      {health.findings.slice(0, 30).map((f, i) => (
        <details className="finding" key={i}>
          <summary>
            <CircleAlert size={14} />
            {f.title}
          </summary>
          <p>{f.detail}</p>
          {f.paths.slice(0, 8).map((p) => (
            <button
              className="text-link"
              key={p}
              onClick={() => useRepo.getState().select(p)}
            >
              {p}
            </button>
          ))}
        </details>
      ))}
      {health.findings.length === 0 && (
        <p className="muted small">No findings from the available rules.</p>
      )}
      <p className="method-note">
        {health.version} · {Math.round(health.coverage * 100)}% text coverage
        <br />
        Security & test coverage: not assessed.
      </p>
    </>
  );
}
export function Inspector() {
  const { snapshot, selectedId, inspector, set, select } = useRepo(),
    node = snapshot.nodes.find((n) => n.id === selectedId),
    [tab, setTab] = useState("Overview"),
    [limit, setLimit] = useState(100);
  useEffect(() => setLimit(100), [selectedId]);
  const children = snapshot.nodes.filter((n) => n.parent === node?.id),
    relations = snapshot.edges.filter(
      (e) =>
        (e.source === selectedId || e.target === selectedId) &&
        e.kind !== "contains",
    );
  const packageNodes = snapshot.nodes.filter((n) => n.kind === "package");
  if (!useRepo.getState().inspectorOpen) return null;
  return (
    <aside className="inspector is-open" aria-label="Inspector">
      <div className="panel-heading">
        <span>
          {inspector === "health"
            ? "HEALTH REPORT"
            : node
              ? "INSPECTOR"
              : "REPOSITORY OVERVIEW"}
        </span>
        {snapshot.demo && <span className="demo-tag">DEMO</span>}
        <button
          aria-label="Close inspector"
          className="icon-button"
          onClick={() => {
            set({ inspectorOpen: false });
          }}
        >
          <X size={14} />
        </button>
      </div>
      <div className="inspector-content scroll-area">
        {inspector === "health" ? (
          <Health />
        ) : node ? (
          <>
            <div className="inspector-title">
              {node.kind === "package" ? (
                <Box size={22} />
              ) : node.kind === "function" ? (
                <Braces size={22} />
              ) : (
                <FileCode2 size={22} />
              )}
              <h2>{node.name}</h2>
            </div>
            <p className="file-path">
              {node.path}
              {node.line ? `:${node.line}` : ""}
            </p>
            <div className="file-kind">
              {node.language}
              <span>{node.kind}</span>
            </div>
            <div className="inspector-tabs">
              {["Overview", "Relations"].map((t) => (
                <button
                  key={t}
                  className={tab === t ? "active" : ""}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            {tab === "Overview" ? (
              <>
                <dl className="properties">
                  <div>
                    <dt>Lines of code</dt>
                    <dd>{number(node.loc)}</dd>
                  </div>
                  <div>
                    <dt>Size</dt>
                    <dd>{number(node.bytes)} B</dd>
                  </div>
                  <div>
                    <dt>Group</dt>
                    <dd>{node.group}</dd>
                  </div>
                  {node.complexity !== undefined && (
                    <div>
                      <dt>Complexity</dt>
                      <dd>{node.complexity}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Relationships</dt>
                    <dd>{relations.length}</dd>
                  </div>
                </dl>
                {node.kind === "package" && (
                  <button
                    className="focus-action"
                    onClick={() => set({ focus: node.group, layout: "cloud" })}
                  >
                    <Focus size={15} />
                    Unfold this package
                  </button>
                )}
                <div className="section-heading">
                  {node.kind === "package" ? "FILES" : "FUNCTIONS"}{" "}
                  <span>{children.length}</span>
                </div>
                {children.slice(0, limit).map((n) => (
                  <button
                    className="child-row"
                    key={n.id}
                    onClick={() => select(n.id)}
                  >
                    {n.kind === "function" ? (
                      <Braces size={13} />
                    ) : (
                      <FileCode2 size={13} />
                    )}
                    <span>{n.name}</span>
                    <small>{n.line ? `L${n.line}` : number(n.loc)}</small>
                  </button>
                ))}
                {!children.length && (
                  <p className="small muted">
                    {node.kind === "function"
                      ? "Select Relations to trace resolved calls."
                      : node.functionAnalyzed
                        ? "No function definitions detected."
                        : "Function analysis is available for analyzed JavaScript and TypeScript files."}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="section-heading">
                  CONNECTED ELEMENTS <span>{relations.length}</span>
                </div>
                {relations.slice(0, limit).map((e) => {
                  const target = snapshot.nodes.find(
                    (n) =>
                      n.id === (e.source === selectedId ? e.target : e.source),
                  );
                  return (
                    target && (
                      <button
                        className="relation-row"
                        key={e.id}
                        onClick={() => select(target.id)}
                      >
                        <ArrowUpRight size={14} />
                        <span>
                          {target.name}
                          <small>
                            {e.source === selectedId ? "outgoing" : "incoming"}{" "}
                            {e.kind}
                          </small>
                        </span>
                      </button>
                    )
                  );
                })}
                {!relations.length && (
                  <p className="small muted">
                    No statically resolved relationships.
                  </p>
                )}
              </>
            )}
            {(children.length > limit || relations.length > limit) && (
              <button
                className="text-link list-more"
                onClick={() => setLimit(limit + 100)}
              >
                Show 100 more elements (
                {Math.max(children.length, relations.length) - limit} remaining)
              </button>
            )}
            {!snapshot.demo && (
              <a
                className="github-link"
                href={`https://github.com/${snapshot.repository}/blob/${snapshot.sha}/${node.path}${node.line ? `#L${node.line}` : ""}`}
                target="_blank"
                rel="noreferrer"
              >
                View on GitHub
                <ExternalLink size={13} />
              </a>
            )}
          </>
        ) : (
          <>
            <div className="overview-mark">
              <GitBranch size={22} />
            </div>
            <h2>
              One repository.
              <br />A new perspective.
            </h2>
            <p className="muted small">
              Follow the connections. Unfold the architecture. See how your code
              evolves.
            </p>
            <dl className="properties overview-properties">
              <div>
                <dt>Files</dt>
                <dd>
                  {number(
                    snapshot.nodes.filter((n) => n.kind === "file").length,
                  )}
                </dd>
              </div>
              <div>
                <dt>Lines of code</dt>
                <dd>
                  {number(
                    snapshot.nodes
                      .filter((n) => n.kind === "file")
                      .reduce((s, n) => s + n.loc, 0),
                  )}
                </dd>
              </div>
              <div>
                <dt>Functions</dt>
                <dd>
                  {number(
                    snapshot.nodes.filter((n) => n.kind === "function").length,
                  )}
                </dd>
              </div>
              <div>
                <dt>Dependencies</dt>
                <dd>{snapshot.dependencies.length}</dd>
              </div>
            </dl>
            <div className="section-heading">CODEBASE GROUPS</div>
            {packageNodes.map((p) => (
              <button
                className="overview-group"
                key={p.id}
                onClick={() => select(p.id)}
              >
                <span>
                  <i
                    style={{
                      background: groupColor(
                        p.group,
                        packageNodes.map((n) => n.group),
                      ),
                    }}
                  />
                  {p.name}
                </span>
                <span>
                  {number(p.loc)}
                  <ChevronRight size={13} />
                </span>
              </button>
            ))}
            <div className="inspector-tip">
              <Focus size={16} />
              <p>
                Click a point to inspect a file.
                <br />
                Use <b>Layers</b> to reveal structure.
              </p>
            </div>
          </>
        )}
        {snapshot.coverage.partial && (
          <p className="coverage-note">
            Partial analysis · {snapshot.coverage.skipped} files skipped.
            Limits: 5,000 files, 20 MB text, 500 KB/file.
          </p>
        )}
      </div>
    </aside>
  );
}
