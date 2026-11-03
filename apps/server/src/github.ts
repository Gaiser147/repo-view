import type { Commit, RepoSnapshot } from "../../../packages/core/src/index";
import {
  toCompareResult,
  type CompareResult,
} from "../../../packages/core/src/github-public";
import { Worker } from "node:worker_threads";
import { killCommand } from "./process";
import { fileURLToPath } from "node:url";
export interface RepositoryProvider {
  branches?(
    repository: string,
    page: number,
  ): Promise<{ branches: string[]; hasMore: boolean }>;
  defaultBranch?(repository: string): Promise<string>;
  shutdown?(): void;
  commits(repository: string, ref?: string, page?: number): Promise<Commit[]>;
  compare?(repository: string, base: string, head: string): Promise<CompareResult>;
  analyze(
    repository: string,
    ref?: string,
    onProgress?: (s: string) => void,
  ): Promise<RepoSnapshot>;
}
export async function github<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com/${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "repo-view",
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {}),
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    if (response.status === 403 || response.status === 429)
      throw new Error(
        "GitHub rate limit reached. Retry later or configure a server-side GITHUB_TOKEN.",
      );
    if (response.status === 404)
      throw new Error("Public repository or commit not found.");
    if (response.status === 409) return [] as T;
    throw new Error(`GitHub returned ${response.status}. Retry this analysis.`);
  }
  return response.json() as Promise<T>;
}
export const provider: RepositoryProvider = {
  async branches(repository, page) {
    const branches = await github<{ name: string }[]>(
      `repos/${repository}/branches?per_page=100&page=${page}`,
    );
    return {
      branches: branches.map((b) => b.name),
      hasMore: branches.length === 100,
    };
  },
  async defaultBranch(repository) {
    const meta = await github<any>(`repos/${repository}`);
    if (meta.private)
      throw new Error("Only public repositories are supported.");
    return meta.default_branch;
  },
  shutdown() {
    for (const stop of runningWorkers) stop();
  },
  async commits(repository, ref, page = 1) {
    const meta = await github<any>(`repos/${repository}`);
    if (meta.private)
      throw new Error("Only public repositories are supported.");
    const values = await github<any[]>(
      `repos/${repository}/commits?per_page=50&page=${page}${ref ? `&sha=${encodeURIComponent(ref)}` : ""}`,
    );
    return values.map((c) => ({
      sha: c.sha,
      message: c.commit.message.split("\n")[0],
      date: c.commit.author?.date ?? "",
      author: c.commit.author?.name ?? "Unknown",
    }));
  },
  async compare(repository, base, head) {
    return toCompareResult(
      await github<any>(
        `repos/${repository}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}?per_page=100`,
      ),
    );
  },
  async analyze(repository, ref, onProgress) {
    const meta = await github<any>(`repos/${repository}`);
    if (meta.private)
      throw new Error("Only public repositories are supported.");
    return runAnalysisWorker(
      { repository, ref: ref ?? meta.default_branch, empty: meta.size === 0 },
      onProgress,
    );
  },
};

const runningWorkers = new Set<() => void>();
export function runAnalysisWorker(
  data: { repository: string; ref: string; empty: boolean },
  onProgress?: (s: string) => void,
): Promise<RepoSnapshot> {
  return new Promise<RepoSnapshot>((resolve, reject) => {
    let settled = false,
      childPid: number | undefined;
    const path = fileURLToPath(new URL("./worker.ts", import.meta.url));
    const worker = new Worker(
      `import('tsx/esm/api').then(({tsImport})=>tsImport(${JSON.stringify(path)},${JSON.stringify(import.meta.url)}));`,
      {
        eval: true,
        execArgv: ["--use-env-proxy"],
        workerData: data,
        resourceLimits: { maxOldGenerationSizeMb: 512 },
      },
    );
    const stop = () => {
      if (childPid) killCommand(childPid);
      worker.terminate();
      runningWorkers.delete(stop);
    };
    runningWorkers.add(stop);
    const timeout = setTimeout(() => {
      stop();
      reject(
        new Error("Analysis exceeded 180 seconds. Try a smaller repository."),
      );
    }, 180000);
    worker.on("message", (m) => {
      if (m.childPid) {
        childPid = m.childPid;
        return;
      }
      if (m.childStopped) {
        childPid = undefined;
        return;
      }
      if (m.progress) onProgress?.(m.progress);
      else if (m.snapshot || m.error) {
        settled = true;
        clearTimeout(timeout);
        if (m.error) reject(new Error(m.error));
        else resolve(m.snapshot);
        stop();
      }
    });
    worker.on("error", (e) => {
      clearTimeout(timeout);
      stop();
      reject(e);
    });
    worker.on("exit", (code) => {
      clearTimeout(timeout);
      if (childPid) killCommand(childPid);
      runningWorkers.delete(stop);
      if (!settled)
        reject(
          new Error(
            "Analysis worker stopped before returning a snapshot. Retry this repository.",
          ),
        );
    });
  });
}
