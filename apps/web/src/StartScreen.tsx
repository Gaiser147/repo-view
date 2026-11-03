import { useState } from "react";
import { ArrowRight, Clock3, GitFork, X } from "lucide-react";
import { useRepo, loadRepository, openDemo, store } from "./state";

const examples = [
  { repo: "pmndrs/zustand", note: "State management · TypeScript" },
  { repo: "sindresorhus/ky", note: "HTTP client · TypeScript" },
  { repo: "expressjs/express", note: "Web framework · JavaScript" },
];
function recent(): string[] {
  try {
    return JSON.parse(localStorage.getItem("repo-view:recent") ?? "[]").slice(
      0,
      4,
    );
  } catch {
    return [];
  }
}
export function rememberRepository(repository: string) {
  store(
    "repo-view:recent",
    JSON.stringify(
      [repository, ...recent().filter((r) => r !== repository)].slice(0, 6),
    ),
  );
}
export function parseRepositoryInput(value: string) {
  let input = value
    .trim()
    .replace(/\.git\/?$/, "")
    .replace(/\/$/, "");
  if (input.startsWith("https://github.com/")) input = input.slice(19);
  if (input.startsWith("github.com/")) input = input.slice(11);
  return /^[A-Za-z0-9][A-Za-z0-9_-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(input)
    ? input
    : null;
}

/** First screen and repository picker. Also reachable from the repository name in the top bar. */
export function StartScreen({ onClose }: { onClose: () => void }) {
  const { snapshot, pending, started, set } = useRepo(),
    [repository, setRepository] = useState(""),
    [branch, setBranch] = useState(""),
    [problem, setProblem] = useState(""),
    history = recent();
  const start = () => {
    set({ started: true });
    store("repo-view:started", "1");
    onClose();
  };
  const analyze = (value: string, ref?: string) => {
    const parsed = parseRepositoryInput(value);
    if (!parsed) {
      setProblem(
        "Enter a public GitHub repository as owner/name or a github.com URL.",
      );
      return;
    }
    rememberRepository(parsed);
    start();
    void loadRepository(parsed, ref || undefined, ref || "main");
  };
  return (
    <section className="start-screen" aria-label="Open a repository">
      <div className="start-sheet">
        {started && (
          <button
            className="icon-button start-close"
            aria-label="Close repository form"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        )}
        <h1>See the shape of a repository</h1>
        <p className="start-lead">
          Paste a public GitHub repository. repo-view draws its files,
          dependencies and history as one plan you can turn, layer and compare
          across commits. No sign-in needed.
        </p>
        <form
          className="start-form"
          onSubmit={(e) => {
            e.preventDefault();
            analyze(repository, branch.trim());
          }}
        >
          <div className="field">
            <label htmlFor="repository-url">Repository URL</label>
            <input
              id="repository-url"
              autoFocus
              placeholder="https://github.com/owner/repository"
              value={repository}
              aria-invalid={!!problem}
              aria-describedby={problem ? "repository-problem" : undefined}
              onChange={(e) => {
                setRepository(e.target.value);
                setProblem("");
              }}
            />
          </div>
          <div className="field branch-field">
            <label htmlFor="branch-ref">Branch or commit</label>
            <input
              id="branch-ref"
              placeholder="Default branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </div>
          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? "Analyzing…" : "Analyze repository"}
            <ArrowRight size={16} />
          </button>
          {problem && (
            <p className="field-problem" id="repository-problem" role="alert">
              {problem}
            </p>
          )}
        </form>
        <div className="start-columns">
          <div>
            <h2>Try one</h2>
            <button
              className="start-row demo"
              onClick={() => {
                openDemo();
                start();
              }}
            >
              <GitFork size={16} strokeWidth={1.6} />
              <span>
                acme/atlas-commerce
                <small>Illustrative demo · 50 commits · loads instantly</small>
              </span>
              <span className="demo-tag">Demo</span>
            </button>
            {examples.map((e) => (
              <button
                key={e.repo}
                className="start-row"
                onClick={() => analyze(e.repo)}
              >
                <GitFork size={16} strokeWidth={1.6} />
                <span>
                  {e.repo}
                  <small>{e.note}</small>
                </span>
              </button>
            ))}
          </div>
          {history.length > 0 && (
            <div>
              <h2>Recently opened</h2>
              {history.map((r) => (
                <button
                  key={r}
                  className="start-row"
                  onClick={() => analyze(r)}
                >
                  <Clock3 size={16} strokeWidth={1.6} />
                  <span>{r}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="start-limits">
          Public repositories up to 5,000 files and 20 MB of text. JavaScript
          and TypeScript get function and call analysis; other languages appear
          as structure.
          {import.meta.env.VITE_ANALYSIS_MODE === "browser" &&
            " Analysis runs in your browser and uses your own GitHub API allowance."}
          {started && (
            <>
              {" "}
              Currently open: <b>{snapshot.repository}</b>.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
