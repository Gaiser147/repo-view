import { parentPort, workerData } from "node:worker_threads";
import { runCommand } from "./process";
import { mkdir, rm, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { analyzeFiles, excluded } from "../../../packages/core/src/analysis";
import type { SourceFile } from "../../../packages/core/src/index";
import { github } from "./github";
const { repository, ref, empty } = workerData;
const dir = resolve(".cache/git", repository.replace("/", "--"));
async function directorySize(path: string): Promise<number> {
  let total = 0;
  for (const e of await readdir(path, { withFileTypes: true })) {
    const p = join(path, e.name);
    total += e.isDirectory() ? await directorySize(p) : (await stat(p)).size;
  }
  return total;
}
async function git(args: string[], input?: string): Promise<Buffer> {
  return runCommand(
    "git",
    [
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "protocol.file.allow=never",
      ...args,
    ],
    {
      cwd: dir,
      input,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_NO_LAZY_FETCH: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_NOSYSTEM: "1",
      },
      checkBudget: async () => (await directorySize(dir)) <= 100 * 1024 * 1024,
      onChild: (pid) =>
        parentPort?.postMessage(
          pid ? { childPid: pid } : { childStopped: true },
        ),
    },
  );
}
async function run() {
  if (empty) {
    parentPort!.postMessage({
      snapshot: analyzeFiles(repository, "empty", []),
    });
    return;
  }
  await mkdir(dir, { recursive: true });
  // Each analysis uses an isolated cache directory managed by a per-repository queue in the server.
  await git(["init", "--bare", "."]);
  await git([
    "config",
    "remote.origin.url",
    `https://github.com/${repository}.git`,
  ]);
  await git(["config", "remote.origin.promisor", "true"]);
  await git([
    "config",
    "remote.origin.partialclonefilter",
    "blob:limit=512000",
  ]);
  parentPort!.postMessage({
    progress: "Fetching a bounded repository snapshot…",
  });
  await git([
    "fetch",
    "--depth=50",
    "--no-tags",
    "--filter=blob:limit=512000",
    "origin",
    ref,
  ]);
  if ((await directorySize(dir)) > 100 * 1024 * 1024) {
    await rm(dir, { recursive: true, force: true });
    throw new Error(
      "Repository download exceeds 100 MB. Try a smaller repository.",
    );
  }
  const sha = (await git(["rev-parse", "FETCH_HEAD^{commit}"]))
    .toString()
    .trim();
  parentPort!.postMessage({
    progress: "Reading files and resolving static relationships…",
  });
  const entries = (await git(["ls-tree", "-rz", "--full-tree", sha]))
    .toString()
    .split("\0")
    .filter(Boolean)
    .map((line) => {
      const tab = line.indexOf("\t"),
        [mode, type, oid] = line.slice(0, tab).split(" ");
      return { mode, type, oid, path: line.slice(tab + 1) };
    })
    .filter(
      (f) => f.type === "blob" && f.mode !== "120000" && !excluded(f.path),
    );
  const selected = entries.slice(0, 5000),
    oids = selected.map((f) => f.oid);
  const checked = (
    await git(
      ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
      oids.join("\n") + "\n",
    )
  )
    .toString()
    .trim()
    .split("\n");
  let budget = 0;
  const accepted = new Set<string>();
  const sizes = new Map<string, number>();
  for (const line of checked) {
    const [oid, type, size] = line.split(" ");
    const n = Number(size);
    sizes.set(oid, Number.isFinite(n) ? n : 512001);
    if (type === "blob" && n <= 512000 && budget + n <= 20 * 1024 * 1024) {
      accepted.add(oid);
      budget += n;
    }
  }
  const raw = accepted.size
      ? await git(["cat-file", "--batch"], [...accepted].join("\n") + "\n")
      : Buffer.alloc(0),
    contents = new Map<string, string>();
  let offset = 0;
  while (offset < raw.length) {
    const end = raw.indexOf(10, offset);
    if (end < 0) break;
    const [oid, , size] = raw.subarray(offset, end).toString().split(" "),
      n = Number(size);
    if (!Number.isFinite(n)) break;
    contents.set(oid, raw.subarray(end + 1, end + 1 + n).toString("utf8"));
    offset = end + 1 + n + 1;
  }
  const files: SourceFile[] = selected.map((f) => ({
    path: f.path,
    hash: f.oid,
    size: sizes.get(f.oid) ?? 512001,
    content: contents.get(f.oid),
  }));
  const snapshot = analyzeFiles(repository, sha, files);
  snapshot.coverage.total = entries.length;
  snapshot.coverage.skipped += Math.max(0, entries.length - selected.length);
  snapshot.coverage.partial = snapshot.coverage.skipped > 0;
  // GitHub job names can be customized or expanded by a matrix; match exact names only.
  try {
    const runs = await github<any>(
      `repos/${repository}/actions/runs?head_sha=${sha}&per_page=20`,
    );
    const latestByPath = new Map<string, any>();
    for (const run of runs.workflow_runs ?? [])
      if (!latestByPath.has(run.path)) latestByPath.set(run.path, run);
    for (const [path, run] of latestByPath) {
      const jobs = await github<any>(
        `repos/${repository}/actions/runs/${run.id}/jobs?per_page=100`,
      );
      for (const job of snapshot.pipeline.jobs.filter((j) =>
        j.id.startsWith(path + ":"),
      )) {
        const found = jobs.jobs?.find((j: any) => j.name === job.name);
        if (found) {
          job.status = found.conclusion ?? found.status;
          job.url = found.html_url;
        }
      }
      snapshot.pipeline.runUrl ??= run.html_url;
    }
  } catch (e) {
    snapshot.pipeline.warnings.push(
      e instanceof Error ? e.message : "Actions data unavailable.",
    );
  }
  parentPort!.postMessage({ snapshot });
}
run().catch((e) => parentPort!.postMessage({ error: e.message }));
