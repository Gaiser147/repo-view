import { useHover } from "./hover";
import { useRepo } from "./state";
import { fileComplexity } from "../../../packages/core/src/insights";
import { useMemo } from "react";

/** Names a point before it is clicked and says what a click will do. */
export function HoverCard() {
  const { id, x, y } = useHover(),
    snapshot = useRepo((s) => s.snapshot),
    history = useRepo((s) => s.history),
    diff = useRepo((s) => s.diff),
    lens = useRepo((s) => s.lens),
    complexity = useMemo(() => fileComplexity(snapshot), [snapshot]);
  const node = id ? snapshot.nodes.find((n) => n.id === id) : undefined;
  if (!node) return null;
  const functions = snapshot.nodes.filter((n) => n.parent === node.id).length,
    links = snapshot.edges.filter(
      (e) =>
        e.kind !== "contains" && (e.source === node.id || e.target === node.id),
    ).length,
    file = history?.files.get(node.path),
    state = diff?.added.includes(node.path)
      ? "Added"
      : diff?.changed.includes(node.path)
        ? "Changed"
        : undefined;
  return (
    <div
      className="hover-card"
      role="tooltip"
      style={{ left: Math.min(x + 16, innerWidth - 280), top: y + 16 }}
    >
      <b>{node.name}</b>
      <code>{node.path}</code>
      <span>
        {node.kind === "function"
          ? `Function · complexity ${node.complexity ?? "—"}${node.line ? ` · line ${node.line}` : ""}`
          : `${node.loc.toLocaleString("en")} lines · ${functions} functions · ${links} links`}
      </span>
      {node.kind === "file" && (lens === "hotspots" || lens === "authors") && (
        <span>
          {file
            ? `${file.changes} changes · last by ${file.lastAuthor}`
            : "No change in opened commits"}
          {lens === "hotspots" && complexity.has(node.id)
            ? ` · complexity ${complexity.get(node.id)}`
            : ""}
        </span>
      )}
      {state && (
        <span className={`hover-state ${state.toLowerCase()}`}>
          {state} in this comparison
        </span>
      )}
      <small>Click to inspect</small>
    </div>
  );
}
