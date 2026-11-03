import { useEffect, useMemo, useRef, useState } from "react";
import {
  Braces,
  FileCode2,
  GitCommitHorizontal,
  Search,
  SquareTerminal,
  Telescope,
} from "lucide-react";
import { useRepo, lenses, loadCommit } from "./state";

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}
type Entry = {
  key: string;
  kind: "lens" | "action" | "file" | "function" | "commit";
  label: string;
  detail?: string;
  run: () => void;
};
const icons = {
  lens: Telescope,
  action: SquareTerminal,
  file: FileCode2,
  function: Braces,
  commit: GitCommitHorizontal,
};
const groupNames = {
  lens: "Lenses",
  action: "Actions",
  file: "Files",
  function: "Functions",
  commit: "Commits",
};

/** One field for files, functions, commits, lenses and actions. Opens with ⌘K, Ctrl+K or /. */
export function CommandPalette({ actions }: { actions: PaletteAction[] }) {
  const { snapshot, commits, query, set, setLens } = useRepo(),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(0),
    input = useRef<HTMLInputElement>(null),
    root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const editable = (e.target as HTMLElement)?.matches?.(
        "input,textarea,select,[contenteditable=true]",
      );
      if (
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") ||
        (e.key === "/" && !editable)
      ) {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", key);
    document.addEventListener("pointerdown", away);
    return () => {
      window.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", away);
    };
  }, []);
  const entries = useMemo<Entry[]>(() => {
    const q = query.trim().toLowerCase(),
      hit = (s: string) => s.toLowerCase().includes(q);
    const lensEntries: Entry[] = lenses
      .filter((l) => !q || hit(l.name) || hit(l.question))
      .map((l, i) => ({
        key: `lens:${l.id}`,
        kind: "lens",
        label: l.name,
        detail: `${l.question} · ${i + 1}`,
        run: () => setLens(l.id),
      }));
    const actionEntries: Entry[] = actions
      .filter((a) => !q || hit(a.label))
      .map((a) => ({
        key: `action:${a.id}`,
        kind: "action",
        label: a.label,
        detail: a.hint,
        run: a.run,
      }));
    if (!q) return [...lensEntries, ...actionEntries];
    const nodes: Entry[] = snapshot.nodes
      .filter(
        (n) =>
          n.kind !== "package" &&
          (hit(n.path) || (n.kind === "function" && hit(n.name))),
      )
      .slice(0, 10)
      .sort(
        (a, b) => Number(a.kind === "function") - Number(b.kind === "function"),
      )
      .map((n) => ({
        key: n.id,
        kind: n.kind === "function" ? "function" : "file",
        label: n.name,
        detail: n.path,
        run: () => useRepo.getState().locate(n.id),
      }));
    const commitEntries: Entry[] = commits
      .filter((c) => hit(c.message) || c.sha.startsWith(q))
      .slice(0, 5)
      .map((c) => ({
        key: `commit:${c.sha}`,
        kind: "commit",
        label: c.message,
        detail: `${c.sha.slice(0, 7)} · ${c.author}`,
        run: () => void loadCommit(c.sha),
      }));
    return [...nodes, ...lensEntries, ...actionEntries, ...commitEntries];
  }, [query, snapshot, commits, actions]);
  useEffect(() => setActive(0), [query]);
  const run = (e: Entry) => {
    e.run();
    set({ query: "" });
    setOpen(false);
    input.current?.blur();
  };
  const visible = open || query.length > 0;
  return (
    <div className="command" ref={root}>
      <label className="command-field">
        <Search size={15} strokeWidth={1.6} aria-hidden="true" />
        <input
          ref={input}
          id="repo-search"
          type="search"
          role="searchbox"
          aria-label="Search repository"
          aria-expanded={visible}
          aria-controls="command-results"
          aria-activedescendant={
            visible && entries[active] ? `cmd-${active}` : undefined
          }
          autoComplete="off"
          placeholder="Go to file, function, commit or action…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            set({ query: e.target.value });
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(entries.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && entries[active]) {
              e.preventDefault();
              run(entries[active]);
            } else if (e.key === "Escape") {
              e.stopPropagation();
              set({ query: "" });
              setOpen(false);
              input.current?.blur();
            }
          }}
        />
        <kbd>⌘K</kbd>
      </label>
      {visible && (
        <div className="command-results" id="command-results" role="listbox">
          {entries.length ? (
            entries.map((e, i) => {
              const Icon = icons[e.kind],
                first = i === 0 || entries[i - 1].kind !== e.kind;
              return (
                <div key={e.key} role="presentation">
                  {first && (
                    <div className="command-group">{groupNames[e.kind]}</div>
                  )}
                  <button
                    id={`cmd-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className={i === active ? "active" : ""}
                    onPointerMove={() => setActive(i)}
                    onClick={() => run(e)}
                  >
                    <Icon size={15} strokeWidth={1.6} aria-hidden="true" />
                    <span>
                      {e.label}
                      {e.detail && <small>{e.detail}</small>}
                    </span>
                  </button>
                </div>
              );
            })
          ) : (
            <p>No file, function, commit or action matches “{query}”.</p>
          )}
        </div>
      )}
    </div>
  );
}
