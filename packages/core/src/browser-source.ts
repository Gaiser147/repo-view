import { analyzeFiles, excluded } from "./analysis";
import type { Commit, RepoSnapshot, SourceFile } from "./index";
import { parseRepository } from "./repository";
import { publicApi as api, publicMetadata as metadata } from "./github-public";
export { readPublicHistory } from "./github-public";
type Fetcher = typeof fetch;
async function limitedText(response: Response): Promise<string | undefined> {
  if (Number(response.headers.get("content-length")) > 512000) {
    await response.body?.cancel();
    return undefined;
  }
  if (!response.body) return "";
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 512000) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(buffer);
}
export async function analyzePublicRepository(
  input: string,
  ref?: string,
  onProgress: (message: string) => void = () => {},
  fetcher: Fetcher = fetch,
  blobs?: {
    get: (sha: string) => Promise<string | undefined>;
    put: (sha: string, content: string) => Promise<void>;
  },
): Promise<RepoSnapshot> {
  const repository = parseRepository(input);
  onProgress("Connecting directly to public GitHub…");
  const meta = await metadata(repository, fetcher);
  const commit = await api<{ sha: string } | null>(
    `repos/${repository}/commits/${encodeURIComponent(ref ?? meta.default_branch)}`,
    fetcher,
    true,
  );
  if (!commit) return analyzeFiles(repository, "empty", []);
  if (!/^[a-f0-9]{40}$/i.test(commit.sha))
    throw new Error("GitHub returned an invalid commit.");
  const sha = commit.sha;
  const tree = await api<{
    truncated: boolean;
    tree: {
      path: string;
      type: string;
      mode: string;
      sha: string;
      size?: number;
    }[];
  }>(`repos/${repository}/git/trees/${sha}?recursive=1`, fetcher);
  const entries = tree.tree.filter(
      (f) => f.type === "blob" && f.mode !== "120000" && !excluded(f.path),
    ),
    selected = entries.slice(0, 5000);
  let budget = 0,
    completed = 0,
    failed = 0,
    cursor = 0;
  const files: SourceFile[] = selected.map((f) => ({
    path: f.path,
    size: f.size ?? 512001,
    hash: f.sha,
  }));
  const downloadable = selected
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => {
      const n = f.size ?? 512001;
      if (n > 512000 || budget + n > 20 * 1024 * 1024) return false;
      budget += n;
      return true;
    });
  onProgress(`Downloading ${downloadable.length} bounded source files…`);
  await Promise.all(
    Array.from({ length: Math.min(6, downloadable.length) }, async () => {
      while (cursor < downloadable.length) {
        const { f, i } = downloadable[cursor++];
        try {
          const cached = await blobs?.get(f.sha);
          if (cached !== undefined) {
            files[i].content = cached;
            completed++;
            continue;
          }
          const path = f.path.split("/").map(encodeURIComponent).join("/");
          const response = await fetcher(
            `https://raw.githubusercontent.com/${repository}/${sha}/${path}`,
            {
              credentials: "omit",
              referrerPolicy: "no-referrer",
              signal: AbortSignal.timeout(20000),
            },
          );
          if (!response.ok) {
            await response.body?.cancel();
            failed++;
          } else {
            files[i].content = await limitedText(response);
            if (files[i].content !== undefined)
              await blobs?.put(f.sha, files[i].content!);
          }
        } catch {
          failed++;
        }
        completed++;
        if (completed % 10 === 0 || completed === downloadable.length)
          onProgress(`Reading source ${completed} / ${downloadable.length}…`);
      }
    }),
  );
  if (downloadable.length > 0 && files.every((f) => f.content === undefined))
    throw new Error(
      "Source files could not be downloaded from GitHub. Check your connection and retry.",
    );
  onProgress(
    "Analyzing functions, imports and dependency cycles in your browser…",
  );
  const snapshot = analyzeFiles(repository, sha, files);
  snapshot.coverage.total = entries.length;
  snapshot.coverage.skipped += entries.length - selected.length;
  snapshot.coverage.partial = snapshot.coverage.skipped > 0 || tree.truncated;
  if (tree.truncated)
    snapshot.pipeline.warnings.push(
      "GitHub truncated this repository tree. Counts and analysis cover only the returned files.",
    );
  if (failed)
    snapshot.pipeline.warnings.push(
      `${failed} source downloads were unavailable. Coverage excludes those files.`,
    );
  if (snapshot.pipeline.jobs.length)
    try {
      const runs = await api<{ workflow_runs: any[] }>(
          `repos/${repository}/actions/runs?head_sha=${sha}&per_page=20`,
          fetcher,
        ),
        latest = new Map<string, any>();
      for (const run of runs.workflow_runs ?? [])
        if (!latest.has(run.path)) latest.set(run.path, run);
      for (const [path, run] of [...latest].slice(0, 5)) {
        const jobs = await api<{ jobs: any[] }>(
          `repos/${repository}/actions/runs/${run.id}/jobs?per_page=100`,
          fetcher,
        );
        for (const job of snapshot.pipeline.jobs.filter((j) =>
          j.id.startsWith(path + ":"),
        )) {
          const match = jobs.jobs?.find((j) => j.name === job.name);
          if (match) {
            job.status = match.conclusion ?? match.status;
            job.url = match.html_url;
          }
        }
        snapshot.pipeline.runUrl ??= run.html_url;
      }
      if (latest.size > 5)
        snapshot.pipeline.warnings.push(
          "Run results are limited to five workflows to conserve the public API quota. Other jobs remain unassessed.",
        );
    } catch (error) {
      snapshot.pipeline.warnings.push(
        error instanceof Error
          ? error.message
          : "GitHub Actions data unavailable.",
      );
    }
  return snapshot;
}
