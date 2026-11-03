import type { RepoSnapshot } from "./index";

export interface ScriptStep {
  id: string;
  manifest: string;
  name: string;
  command: string;
  /** Scripts this one runs, including npm's pre/post hooks. */
  runs: string[];
  /** Workflow jobs whose steps run this script. */
  ci: string[];
}

const runner =
  /(?:^|&&|\|\||;|\s)(?:npm(?:\s+run(?:-script)?)?|pnpm(?:\s+run)?|yarn(?:\s+run)?|bun(?:\s+run)?)\s+(?:-[\w-]+\s+)*([\w:.-]+)/g;
const builtin = new Set(["install", "ci", "i", "add", "exec", "dlx", "x"]);

/** Names of package scripts a command invokes, such as `npm run build && npm test`. */
export function invokedScripts(command: string) {
  const out: string[] = [];
  for (const m of command.matchAll(runner)) if (!builtin.has(m[1])) out.push(m[1]);
  return out;
}

/** npm scripts as a pipeline: what each script runs and which CI jobs run it. */
export function scriptPipeline(snapshot: RepoSnapshot): ScriptStep[] {
  const scripts = snapshot.scripts ?? [];
  return scripts.map((s) => {
    const siblings = new Set(scripts.filter((o) => o.manifest === s.manifest).map((o) => o.name)),
      runs = [
        ...(siblings.has(`pre${s.name}`) ? [`pre${s.name}`] : []),
        ...invokedScripts(s.command).filter((n) => siblings.has(n) && n !== s.name),
        ...(siblings.has(`post${s.name}`) ? [`post${s.name}`] : []),
      ];
    const ci = snapshot.pipeline.jobs
      .filter((j) =>
        j.steps.some((step) => invokedScripts(step).includes(s.name) || (s.name === "test" && /\b(npm|pnpm|yarn)\s+t(est)?\b/.test(step))),
      )
      .map((j) => j.name);
    return { id: `${s.manifest}:${s.name}`, manifest: s.manifest, name: s.name, command: s.command, runs: [...new Set(runs)], ci };
  });
}
