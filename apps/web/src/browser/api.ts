import type { RepoSnapshot } from "../../../../packages/core/src/index";
import { analysisRequest } from "../../../../packages/core/src/index";
import { parseRepository } from "../../../../packages/core/src/repository";
import { readPublicHistory } from "../../../../packages/core/src/github-public";
interface Job {
  id: string;
  status: "running" | "complete" | "error";
  progress: string;
  snapshot?: RepoSnapshot;
  error?: string;
  priority?: "foreground" | "background";
  worker?: Worker;
  timer?: ReturnType<typeof setTimeout>;
}
const jobs = new Map<string, Job>();
export async function browserRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = new URL(path, location.origin);
  if (url.pathname === "/api/health")
    return { status: "ok", mode: "browser" } as T;
  if (url.pathname === "/api/analyses" && init?.method === "POST") {
    const body = analysisRequest.parse(JSON.parse(String(init.body))),
      repository = parseRepository(body.repository);
    const priority = body.priority ?? "foreground";
    if (
      priority === "background" &&
      [...jobs.values()].some((j) => j.status === "running")
    )
      throw new Error("Background analysis paused.");
    for (const job of jobs.values())
      if (job.status === "running") {
        job.worker?.terminate();
        clearTimeout(job.timer);
        job.worker = undefined;
        job.status = "error";
        job.error = "Replaced by a newer analysis.";
      }
    while (jobs.size >= 12) {
      const first = jobs.keys().next().value!;
      jobs.delete(first);
    }
    const id = crypto.randomUUID(),
      worker = new Worker(new URL("./analysis.worker.ts", import.meta.url), {
        type: "module",
      }),
      job: Job = {
        id,
        priority,
        status: "running",
        progress: "Starting browser analysis…",
        worker,
      };
    jobs.set(id, job);
    const stop = () => {
      clearTimeout(job.timer);
      worker.terminate();
      job.worker = undefined;
    };
    job.timer = setTimeout(() => {
      job.status = "error";
      job.error =
        "Browser analysis exceeded 180 seconds. Try a smaller repository.";
      stop();
    }, 180000);
    worker.onmessage = (event) => {
      if (event.data.progress) job.progress = event.data.progress;
      else if (event.data.snapshot) {
        job.status = "complete";
        job.progress = "Ready";
        job.snapshot = event.data.snapshot;
        stop();
      } else if (event.data.error) {
        job.status = "error";
        job.error = event.data.error;
        stop();
      }
    };
    worker.onerror = () => {
      job.status = "error";
      job.error =
        "The browser analysis worker stopped. Retry or choose a smaller repository.";
      stop();
    };
    worker.postMessage({ repository, ref: body.ref });
    return { id } as T;
  }
  const jobMatch = url.pathname.match(/^\/api\/analyses\/([^/]+)$/);
  if (jobMatch) {
    const job = jobs.get(jobMatch[1]);
    if (init?.method === "DELETE" && job) {
      job.worker?.terminate();
      clearTimeout(job.timer);
      job.worker = undefined;
      job.status = "error";
      job.error = "Analysis cancelled.";
      return { cancelled: true } as T;
    }
    if (!job) throw new Error("Analysis expired. Start it again.");
    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      snapshot: job.snapshot,
      error: job.error,
    } as T;
  }
  const history = url.pathname.match(
    /^\/api\/repos\/([^/]+)\/([^/]+)\/commits$/,
  );
  if (history)
    return (await readPublicHistory(
      `${history[1]}/${history[2]}`,
      url.searchParams.get("ref") ?? undefined,
      Number(url.searchParams.get("page") ?? 1),
    )) as T;
  throw new Error(
    "This operation is unavailable in the browser version. Start a repository analysis.",
  );
}

export function cancelBrowserAnalyses() {
  for (const job of jobs.values())
    if (job.status === "running") {
      job.worker?.terminate();
      clearTimeout(job.timer);
      job.worker = undefined;
      job.status = "error";
      job.error = "Analysis cancelled.";
    }
}
