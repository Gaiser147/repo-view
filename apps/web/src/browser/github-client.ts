export interface Quota {
  remaining?: number;
  resetAt?: number;
  blockedUntil?: number;
}
export class PublicGithubClient {
  quota: Quota;
  private cache = new Map<
    string,
    { body: string; status: number; headers: [string, string][]; until: number }
  >();
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private fetcher: typeof fetch = (input, init) => fetch(input, init),
    private now = Date.now,
    quota: Quota = {},
    private changed: (quota: Quota) => void = () => {},
  ) {
    this.quota = quota;
  }
  request(
    url: string,
    init?: RequestInit,
    background = false,
  ): Promise<Response> {
    const request = this.queue.then(() => this.perform(url, init, background));
    this.queue = request.catch(() => {});
    return request;
  }
  private async perform(url: string, init?: RequestInit, background = false) {
    const now = this.now(),
      cached = this.cache.get(url);
    if (cached && cached.until > now)
      return new Response(cached.body, {
        status: cached.status,
        headers: cached.headers,
      });
    if (this.quota.resetAt && now >= this.quota.resetAt) {
      this.quota.remaining = undefined;
      this.quota.resetAt = undefined;
    }
    if (this.quota.blockedUntil && now >= this.quota.blockedUntil)
      this.quota.blockedUntil = undefined;
    const retryAt = this.quota.blockedUntil ?? this.quota.resetAt;
    if (
      this.quota.blockedUntil ||
      (this.quota.remaining !== undefined &&
        this.quota.remaining <= (background ? 20 : 1))
    ) {
      throw new Error(
        `${background ? "Background cache paused to reserve GitHub requests." : "GitHub API allowance is nearly exhausted. Cached commits remain available."}${retryAt ? " Retry after " + new Date(retryAt).toLocaleTimeString() + "." : " Retry after the public limit resets."}`,
      );
    }
    if (this.quota.remaining !== undefined) this.quota.remaining--;
    const signal = AbortSignal.any([
      ...(init?.signal ? [init.signal] : []),
      AbortSignal.timeout(30000),
    ]);
    signal.throwIfAborted();
    const response = await this.fetcher(url, {
      ...init,
      signal,
      credentials: "omit",
    });
    const remaining = response.headers.get("x-ratelimit-remaining"),
      reset = response.headers.get("x-ratelimit-reset");
    if (remaining !== null && Number.isFinite(Number(remaining)))
      this.quota.remaining = Number(remaining);
    if (reset && Number.isFinite(Number(reset)))
      this.quota.resetAt = Number(reset) * 1000;
    if (
      response.status === 429 ||
      (response.status === 403 &&
        (this.quota.remaining === 0 || response.headers.has("retry-after")))
    ) {
      const retry = response.headers.get("retry-after");
      const retryTime = retry
        ? /^\d+$/.test(retry)
          ? now + Number(retry) * 1000
          : Date.parse(retry)
        : this.quota.resetAt;
      this.quota.blockedUntil =
        retryTime && Number.isFinite(retryTime)
          ? Math.max(now + 1000, retryTime)
          : now + 60000;
    }
    this.changed({ ...this.quota });
    // Small mutable metadata is shared by history and analysis workers. Snapshot/blob storage handles source data.
    if (
      response.ok &&
      !url.includes("/git/trees/") &&
      !url.includes("/actions/")
    ) {
      const body = await response.clone().text();
      if (body.length < 250000) {
        this.cache.set(url, {
          body,
          status: response.status,
          headers: [...response.headers],
          until: now + 120000,
        });
        while (this.cache.size > 40)
          this.cache.delete(this.cache.keys().next().value!);
      }
    }
    return response;
  }
}
function storedQuota(): Quota {
  try {
    return JSON.parse(localStorage.getItem("repo-view-github-quota") ?? "{}");
  } catch {
    return {};
  }
}
export const publicGithub = new PublicGithubClient(
  (input, init) => fetch(input, init),
  Date.now,
  storedQuota(),
  (quota) => {
    try {
      localStorage.setItem("repo-view-github-quota", JSON.stringify(quota));
    } catch {
      /* Optional persistence. */
    }
    if (typeof window !== "undefined")
      window.dispatchEvent(
        new CustomEvent("repo-view:quota", { detail: quota }),
      );
  },
);
