import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { DatabaseSync } from "node:sqlite";
import { mkdir, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  analysisRequest,
  type RepoSnapshot,
} from "../../../packages/core/src/index";
import { parseRepository } from "../../../packages/core/src/analysis";
import { provider as githubProvider, type RepositoryProvider } from "./github";
export async function createApp(
  options: { cachePath?: string; provider?: RepositoryProvider } = {},
) {
  const app = Fastify({ logger: false, bodyLimit: 4096 }),
    provider = options.provider ?? githubProvider,
    path = options.cachePath ?? resolve(".cache/snapshots.sqlite");
  if (path !== ":memory:") await mkdir(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(
    "CREATE TABLE IF NOT EXISTS snapshots (repository TEXT, sha TEXT, version TEXT, value TEXT, PRIMARY KEY(repository,sha,version))",
  );
  const version = "v2",
    jobs = new Map<
      string,
      {
        id: string;
        status: string;
        progress: string;
        snapshot?: RepoSnapshot;
        error?: string;
        repository: string;
        ref?: string;
      }
    >();
  let active = 0;
  const queue: string[] = [],
    busy = new Set<string>();
  const store = (s: RepoSnapshot) =>
    db
      .prepare("INSERT OR REPLACE INTO snapshots VALUES (?,?,?,?)")
      .run(s.repository, s.sha, version, JSON.stringify(s));
  const load = (repo: string, sha: string) => {
    const row = db
      .prepare(
        "SELECT value FROM snapshots WHERE repository=? AND sha=? AND version=?",
      )
      .get(repo, sha, version);
    return row ? JSON.parse(row.value as string) : undefined;
  };
  const drain = () => {
    while (active < 2) {
      const i = queue.findIndex((id) => !busy.has(jobs.get(id)!.repository));
      if (i < 0) break;
      const id = queue.splice(i, 1)[0],
        job = jobs.get(id)!;
      active++;
      busy.add(job.repository);
      job.status = "running";
      provider
        .analyze(job.repository, job.ref, (p) => {
          job.progress = p;
        })
        .then((s) => {
          store(s);
          job.snapshot = s;
          job.status = "complete";
          job.progress = "Ready";
        })
        .catch((e) => {
          job.error = e.message;
          job.status = "error";
        })
        .finally(() => {
          active--;
          busy.delete(job.repository);
          drain();
        });
    }
  };
  app.setErrorHandler((e, _req, reply) =>
    reply.code(400).send({
      error: e instanceof Error ? e.message : "Request could not be completed.",
    }),
  );
  app.get("/api/health", async () => ({ status: "ok" }));
  app.post("/api/analyses", async (req, reply) => {
    const body = analysisRequest.parse(req.body),
      repository = parseRepository(body.repository);
    if (body.ref?.startsWith("-") || body.ref?.includes(".."))
      return reply.code(400).send({ error: "Invalid ref." });
    if (active + queue.length >= 8)
      return reply
        .code(429)
        .send({ error: "Analysis queue is full. Retry shortly." });
    for (const [id, j] of jobs)
      if (j.status === "complete" || j.status === "error") {
        if (jobs.size >= 100) jobs.delete(id);
      }
    const id = randomUUID(),
      cached =
        body.ref && /^[a-f0-9]{40}$/.test(body.ref)
          ? load(repository, body.ref)
          : undefined;
    jobs.set(id, {
      id,
      status: cached ? "complete" : "queued",
      progress: cached ? "Ready" : "Waiting for an analysis slot…",
      repository,
      ref: body.ref,
      snapshot: cached,
    });
    if (!cached) {
      queue.push(id);
      drain();
    }
    return reply.code(202).send({ id });
  });
  app.get<{ Params: { id: string } }>(
    "/api/analyses/:id",
    async (req, reply) =>
      jobs.get(req.params.id) ??
      reply.code(404).send({ error: "Analysis expired. Start it again." }),
  );
  app.get<{
    Params: { owner: string; repo: string };
    Querystring: { ref?: string; page?: string };
  }>("/api/repos/:owner/:repo/commits", async (req) => {
    const repo = parseRepository(`${req.params.owner}/${req.params.repo}`);
    const page = Number(req.query.page ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > 100)
      throw new Error("Invalid history page.");
    const branch =
      req.query.ref ?? (await provider.defaultBranch?.(repo)) ?? "main";
    return { commits: await provider.commits(repo, branch, page), branch };
  });
  app.get<{ Params: { owner: string; repo: string; sha: string } }>(
    "/api/repos/:owner/:repo/snapshots/:sha",
    async (req, reply) => {
      const repo = parseRepository(`${req.params.owner}/${req.params.repo}`),
        s = load(repo, req.params.sha);
      return (
        s ??
        reply.code(404).send({
          error:
            "Snapshot not analyzed yet. Start an analysis for this commit.",
        })
      );
    },
  );
  app.get<{ Params: { owner: string; repo: string; sha: string } }>(
    "/api/repos/:owner/:repo/pipelines/:sha",
    async (req, reply) => {
      const repo = parseRepository(`${req.params.owner}/${req.params.repo}`),
        s = load(repo, req.params.sha);
      return (
        s?.pipeline ??
        reply.code(404).send({ error: "Snapshot not analyzed yet." })
      );
    },
  );
  try {
    await access(resolve("apps/web/dist/index.html"));
    await app.register(fastifyStatic, { root: resolve("apps/web/dist") });
    app.setNotFoundHandler((req, reply) =>
      req.url.startsWith("/api/")
        ? reply.code(404).send({ error: "Endpoint not found." })
        : reply.sendFile("index.html"),
    );
  } catch {
    /* Vite serves the frontend during development. */
  }
  app.addHook("onClose", async () => {
    provider.shutdown?.();
    db.close();
  });
  return app;
}
