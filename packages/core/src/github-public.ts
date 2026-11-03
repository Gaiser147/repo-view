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
  const branch =
    ref ?? (await publicMetadata(repository, fetcher)).default_branch;
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

export async function readPublicBranches(
  input: string,
  page = 1,
  fetcher: Fetcher = fetch,
) {
  const repository = parseRepository(input);
  if (!Number.isInteger(page) || page < 1 || page > 100)
    throw new Error("Invalid branch page.");
  const values = await publicApi<{ name: string }[]>(
    `repos/${repository}/branches?per_page=100&page=${page}`,
    fetcher,
  );
  return {
    branches: values.map((b) => b.name),
    hasMore: values.length === 100,
  };
}

export interface CompareResult {
  files: {
    path: string;
    status: "added" | "removed" | "modified" | "renamed" | "changed" | "copied" | "unchanged";
    previous?: string;
    changes: number;
  }[];
  commits: Commit[];
  totalCommits: number;
  /** GitHub lists at most 300 files per comparison. */
  truncated: boolean;
}
/** Everything that differs between two commits, in one public API request. */
export function toCompareResult(body: any): CompareResult {
  const files = (body.files ?? []).map((f: any) => ({
    path: f.filename,
    status: f.status,
    previous: f.previous_filename,
    changes: f.changes ?? 0,
  }));
  return {
    files,
    commits: (body.commits ?? []).map((c: any) => ({
      sha: c.sha,
      message: String(c.commit?.message ?? "").split("\n")[0],
      date: c.commit?.author?.date ?? "",
      author: c.commit?.author?.name ?? "Unknown",
    })),
    totalCommits: body.total_commits ?? 0,
    truncated: files.length >= 300,
  };
}
export async function readPublicCompare(
  input: string,
  base: string,
  head: string,
  fetcher: Fetcher = fetch,
): Promise<CompareResult> {
  const repository = parseRepository(input);
  if (![base, head].every((s) => /^[a-zA-Z0-9_./-]{1,150}$/.test(s)))
    throw new Error("Invalid commit for comparison.");
  return toCompareResult(
    await publicApi<any>(
      `repos/${repository}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}?per_page=100`,
      fetcher,
    ),
  );
}
