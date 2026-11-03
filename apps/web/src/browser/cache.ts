import type { RepoSnapshot } from "../../../../packages/core/src/index";
const version = "pages-v3",
  MAX_BLOB_BYTES = 20 * 1024 * 1024;
let connection: Promise<IDBDatabase> | undefined;
function database(): Promise<IDBDatabase> {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open("repo-view-browser", 2);
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      connection = undefined;
      reject(new Error("Browser cache unavailable."));
    }, 2000);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("snapshots"))
        db.createObjectStore("snapshots", { keyPath: "key" });
      if (!db.objectStoreNames.contains("blobs"))
        db.createObjectStore("blobs", { keyPath: "sha" }).createIndex(
          "time",
          "time",
        );
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
    };
    request.onsuccess = () => {
      clearTimeout(timer);
      if (expired) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => {
        request.result.close();
        connection = undefined;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      clearTimeout(timer);
      connection = undefined;
      reject(request.error);
    };
  });
  return connection;
}
export async function cachedSnapshot(
  repository: string,
  sha: string,
): Promise<RepoSnapshot | undefined> {
  if (typeof indexedDB === "undefined" || !/^[a-f0-9]{40}$/i.test(sha)) return;
  try {
    const db = await database();
    return await new Promise((resolve) => {
      const tx = db.transaction("snapshots", "readonly"),
        request = tx
          .objectStore("snapshots")
          .get(`${version}:${repository}:${sha}`);
      request.onsuccess = () =>
        resolve(
          request.result && Date.now() - request.result.time < 7 * 86400000
            ? request.result.snapshot
            : undefined,
        );
      request.onerror = () => resolve(undefined);
      tx.onabort = () => resolve(undefined);
    });
  } catch {
    return;
  }
}
export async function cacheSnapshot(snapshot: RepoSnapshot) {
  if (typeof indexedDB === "undefined" || snapshot.demo) return;
  try {
    const db = await database();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("snapshots", "readwrite"),
        store = tx.objectStore("snapshots");
      store.put({
        key: `${version}:${snapshot.repository}:${snapshot.sha}`,
        time: Date.now(),
        snapshot,
      });
      const request = store.getAll();
      request.onsuccess = () => {
        const entries = request.result.sort((a, b) => b.time - a.time);
        let retainedNodes = 0;
        for (let i = 0; i < entries.length; i++) {
          retainedNodes += entries[i].snapshot.nodes.length;
          if (i >= 24 || (retainedNodes > 100000 && i > 0))
            store.delete(entries[i].key);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    /* Optional storage never blocks repository exploration. */
  }
}
export async function cachedBlob(sha: string): Promise<string | undefined> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await database();
    return await new Promise((resolve) => {
      const tx = db.transaction("blobs", "readonly"),
        req = tx.objectStore("blobs").get(sha);
      req.onsuccess = () => resolve(req.result?.content);
      req.onerror = () => resolve(undefined);
      tx.onabort = () => resolve(undefined);
    });
  } catch {
    return;
  }
}
export async function cacheBlob(sha: string, content: string) {
  if (typeof indexedDB === "undefined") return;
  const size = new TextEncoder().encode(content).length;
  if (size > 512000 || content.includes("\0")) return;
  try {
    const db = await database();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["blobs", "meta"], "readwrite"),
        store = tx.objectStore("blobs"),
        meta = tx.objectStore("meta"),
        old = store.get(sha),
        usage = meta.get("blob-bytes");
      let completed = 0;
      const update = () => {
        if (++completed < 2) return;
        let total =
          Number(usage.result ?? 0) - Number(old.result?.size ?? 0) + size;
        store.put({ sha, content, size, time: Date.now() });
        meta.put(total, "blob-bytes");
        if (total > MAX_BLOB_BYTES) {
          const cursor = store.index("time").openCursor();
          cursor.onsuccess = () => {
            const item = cursor.result;
            if (!item || total <= MAX_BLOB_BYTES) return;
            total -= item.value.size;
            item.delete();
            meta.put(total, "blob-bytes");
            item.continue();
          };
        }
      };
      old.onsuccess = update;
      usage.onsuccess = update;
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    /* Quota/private browsing failures simply disable this optimization. */
  }
}
