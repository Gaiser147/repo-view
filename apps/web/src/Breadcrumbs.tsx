import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { useRepo } from "./state";

/** Back/Forward through selections, focus and lenses, and the path of what is selected. */
export function Breadcrumbs() {
  const {
      snapshot,
      selectedId,
      focus,
      navBack,
      navForward,
      navigate,
      select,
      set,
    } = useRepo(),
    node = snapshot.nodes.find((n) => n.id === selectedId),
    file =
      node?.kind === "function"
        ? snapshot.nodes.find((n) => n.id === node.parent)
        : node?.kind === "file"
          ? node
          : undefined,
    group = node?.group ?? focus ?? undefined,
    folders = file
      ? file.path
          .split("/")
          .slice(file.path.startsWith(file.group + "/") ? 1 : 0, -1)
      : [];
  return (
    <nav className="breadcrumbs" aria-label="Location">
      <button
        className="icon-button"
        aria-label="Back"
        title="Back ( [ )"
        disabled={!navBack.length}
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={15} strokeWidth={1.6} />
      </button>
      <button
        className="icon-button"
        aria-label="Forward"
        title="Forward ( ] )"
        disabled={!navForward.length}
        onClick={() => navigate(1)}
      >
        <ArrowRight size={15} strokeWidth={1.6} />
      </button>
      <ol>
        <li>
          <button
            onClick={() => {
              set({ focus: null });
              select(null);
            }}
          >
            {snapshot.repository.split("/")[1]}
          </button>
        </li>
        {group && (
          <li>
            <ChevronRight size={12} aria-hidden="true" />
            <button onClick={() => select(`pkg:${group}`)}>{group}</button>
          </li>
        )}
        {folders.map((f, i) => (
          <li key={i} className="crumb-folder">
            <ChevronRight size={12} aria-hidden="true" />
            <span>{f}</span>
          </li>
        ))}
        {file && (
          <li>
            <ChevronRight size={12} aria-hidden="true" />
            <button
              aria-current={node === file ? "page" : undefined}
              onClick={() => select(file.id)}
            >
              {file.name}
            </button>
          </li>
        )}
        {node?.kind === "function" && (
          <li>
            <ChevronRight size={12} aria-hidden="true" />
            <span aria-current="page">ƒ {node.name}</span>
          </li>
        )}
      </ol>
    </nav>
  );
}
