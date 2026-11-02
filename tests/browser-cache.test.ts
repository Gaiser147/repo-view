import "fake-indexeddb/auto";
import { expect, it, vi } from "vitest";
import {
  cacheSnapshot,
  cachedSnapshot,
  cacheBlob,
  cachedBlob,
} from "../apps/web/src/browser/cache";
import type { RepoSnapshot } from "../packages/core/src/index";
it("persists immutable snapshots beyond the previous five-minute window and reuses blobs by SHA", async () => {
  const snapshot: RepoSnapshot = {
    repository: "cache/test",
    sha: "b".repeat(40),
    nodes: [],
    edges: [],
    demo: false,
    dependencies: [],
    coverage: {
      total: 0,
      analyzed: 0,
      skipped: 0,
      supported: 0,
      unresolvedImports: 0,
      partial: false,
    },
    pipeline: { jobs: [], edges: [], warnings: [] },
  };
  await cacheSnapshot(snapshot);
  const clock = vi
    .spyOn(Date, "now")
    .mockReturnValue(Date.now() + 11 * 60 * 1000);
  expect((await cachedSnapshot(snapshot.repository, snapshot.sha))?.sha).toBe(
    snapshot.sha,
  );
  clock.mockRestore();
  await cacheBlob("c".repeat(40), "export const cached = true;");
  expect(await cachedBlob("c".repeat(40))).toBe("export const cached = true;");
  expect(await cachedBlob("d".repeat(40))).toBeUndefined();
});
