import { analyzePublicRepository } from "../../../../packages/core/src/browser-source";
import { cachedSnapshot, cacheSnapshot, cachedBlob, cacheBlob } from "./cache";
let requestId = 0;
const responses = new Map<
  number,
  { resolve: (response: Response) => void; reject: (error: Error) => void }
>();
const githubFetch: typeof fetch = (input, init) => {
  const url = String(input);
  if (!url.startsWith("https://api.github.com/")) return fetch(input, init);
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    responses.set(id, { resolve, reject });
    self.postMessage({ apiRequest: { requestId: id, url } });
  });
};
self.onmessage = async (event) => {
  if (event.data.apiResponse) {
    const response = event.data.apiResponse,
      pending = responses.get(response.requestId);
    responses.delete(response.requestId);
    if (response.error) pending?.reject(new Error(response.error));
    else
      pending?.resolve(
        new Response(response.body, {
          status: response.status,
          headers: response.headers,
        }),
      );
    return;
  }
  const { repository, ref } = event.data;
  try {
    const cached = ref ? await cachedSnapshot(repository, ref) : undefined;
    const snapshot =
      cached ??
      (await analyzePublicRepository(
        repository,
        ref,
        (progress) => self.postMessage({ progress }),
        githubFetch,
        { get: cachedBlob, put: cacheBlob },
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
