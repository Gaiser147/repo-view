import type { RepoSnapshot } from "../../../../packages/core/src/index";
const version = "pages-v1";
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("repo-view-browser", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("snapshots", { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function cachedSnapshot(
  repository: string,
  sha: string,
): Promise<RepoSnapshot | undefined> {
  if (typeof indexedDB === "undefined" || !/^[a-f0-9]{40}$/i.test(sha)) return;
  let db: IDBDatabase | undefined;
  try {
    db = await database();
    return await new Promise((resolve) => {
      const request = db!
        .transaction("snapshots", "readonly")
        .objectStore("snapshots")
        .get(`${version}:${repository}:${sha}`);
      request.onsuccess = () =>
        resolve(
          request.result && Date.now() - request.result.time < 300000
            ? request.result.snapshot
            : undefined,
        );
      request.onerror = () => resolve(undefined);
    });
  } catch {
    return;
  } finally {
    db?.close();
  }
}
export async function cacheSnapshot(snapshot: RepoSnapshot) {
  if (typeof indexedDB === "undefined") return;
  let db: IDBDatabase | undefined;
  try {
    db = await database();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction("snapshots", "readwrite"),
        store = tx.objectStore("snapshots");
      store.put({
        key: `${version}:${snapshot.repository}:${snapshot.sha}`,
        time: Date.now(),
        snapshot,
      });
      const request = store.getAll();
      request.onsuccess = () => {
        const entries = request.result.sort((a, b) => b.time - a.time);
        for (const old of entries.slice(12)) store.delete(old.key);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    /* Cache availability never blocks an analysis. */
  } finally {
    db?.close();
  }
}
