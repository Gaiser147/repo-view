import { parseRepository } from "./repository";
import type { Commit } from "./index";
type Fetcher = typeof fetch;
export async function publicApi<T>(
  path: string,
  fetcher: Fetcher,
  allowEmpty = false,
): Promise<T> {
  const response = await fetcher(`https://api.github.com/${path}`, {
    credentials: "omit",
    headers: { Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(30000),
  });
  if (allowEmpty && response.status === 409) return null as T;
  if (!response.ok) {
    if (response.status === 403 || response.status === 429)
      throw new Error(
        "GitHub public API limit reached. Retry after the limit resets. No server or token is required.",
      );
    if (response.status === 404)
      throw new Error("Public repository, branch or commit not found.");
    throw new Error(
      `GitHub returned ${response.status}. Retry this repository.`,
    );
  }
  return response.json() as Promise<T>;
}
export async function publicMetadata(repository: string, fetcher: Fetcher) {
  const meta = await publicApi<{ private: boolean; default_branch: string }>(
    `repos/${repository}`,
    fetcher,
  );
  if (meta.private) throw new Error("Only public repositories are supported.");
  return meta;
}
export async function readPublicHistory(
  input: string,
  ref?: string,
  page = 1,
  fetcher: Fetcher = fetch,
): Promise<{ commits: Commit[]; branch: string }> {
  const repository = parseRepository(input);
  if (!Number.isInteger(page) || page < 1 || page > 100)
    throw new Error("Invalid history page.");
  const meta = await publicMetadata(repository, fetcher),
    branch = ref ?? meta.default_branch;
  const commits = await publicApi<any[] | null>(
    `repos/${repository}/commits?sha=${encodeURIComponent(branch)}&per_page=50&page=${page}`,
    fetcher,
    true,
  );
  return {
    branch,
    commits: (commits ?? []).map((c) => ({
      sha: c.sha,
      message: String(c.commit.message).split("\n")[0],
      date: c.commit.author?.date ?? "",
      author: c.commit.author?.name ?? "Unknown",
    })),
  };
}
