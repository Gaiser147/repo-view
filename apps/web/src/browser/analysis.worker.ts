import { analyzePublicRepository } from "../../../../packages/core/src/browser-source";
import { cachedSnapshot, cacheSnapshot } from "./cache";
self.onmessage = async (event) => {
  const { repository, ref } = event.data;
  try {
    const cached = ref ? await cachedSnapshot(repository, ref) : undefined;
    const snapshot =
      cached ??
      (await analyzePublicRepository(repository, ref, (progress) =>
        self.postMessage({ progress }),
      ));
    if (!cached) await cacheSnapshot(snapshot);
    self.postMessage({ snapshot });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error
          ? error.message
          : "Browser analysis failed. Retry this repository.",
    });
  }
};
