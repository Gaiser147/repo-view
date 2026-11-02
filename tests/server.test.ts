import { expect, it } from "vitest";
import { createApp } from "../apps/server/src/app";
import { analyzeFiles } from "../packages/core/src/analysis";
it("rejects invalid repositories and exposes analysis through a bounded job", async () => {
  const app = await createApp({
    cachePath: ":memory:",
    provider: {
      async defaultBranch() {
        return "master";
      },
      async commits(_repo, ref) {
        expect(ref).toBe("master");
        return [
          {
            sha: "a".repeat(40),
            message: "initial",
            date: "2026-01-01",
            author: "test",
          },
        ];
      },
      async analyze(repository: string) {
        return analyzeFiles(repository, "a".repeat(40), [
          {
            path: "src/index.ts",
            content: "export function hello() { return 1; }",
          },
        ]);
      },
    },
  });
  expect(
    (
      await app.inject({
        method: "POST",
        url: "/api/analyses",
        payload: { repository: "https://evil.test/x/y" },
      })
    ).statusCode,
  ).toBe(400);
  const response = await app.inject({
    method: "POST",
    url: "/api/analyses",
    payload: { repository: "a/b" },
  });
  expect(response.statusCode).toBe(202);
  const id = response.json().id;
  let job: any;
  for (let i = 0; i < 20; i++) {
    job = (await app.inject(`/api/analyses/${id}`)).json();
    if (job.status === "complete") break;
    await new Promise((r) => setTimeout(r, 5));
  }
  expect(job.status).toBe("complete");
  expect(job.snapshot.nodes.some((n: any) => n.name === "hello")).toBe(true);
  const snapshot = await app.inject(
    "/api/repos/a/b/snapshots/" + "a".repeat(40),
  );
  expect(snapshot.statusCode).toBe(200);
  expect(
    (await app.inject("/api/repos/a/b/commits")).json().commits,
  ).toHaveLength(1);
  expect((await app.inject("/api/analyses/missing")).statusCode).toBe(404);
  await app.close();
});
