import { expect, it } from "vitest";
import { runAnalysisWorker } from "../apps/server/src/github";
it("ignores loader control messages and returns a complete empty-repository snapshot", async () => {
  const snapshot = await runAnalysisWorker({
    repository: "fixture/empty",
    ref: "main",
    empty: true,
  });
  expect(snapshot.repository).toBe("fixture/empty");
  expect(snapshot.nodes).toEqual([]);
  expect(snapshot.sha).toBe("empty");
});
