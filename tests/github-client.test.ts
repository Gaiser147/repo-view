import { expect, it, vi } from "vitest";
import { PublicGithubClient } from "../apps/web/src/browser/github-client";
it("shares metadata across workers, keeps foreground quota in reserve and resumes after reset", async () => {
  let now = 1000;
  const fetcher = vi.fn(async () =>
    Response.json(
      { default_branch: "main" },
      { headers: { "x-ratelimit-remaining": "19", "x-ratelimit-reset": "3" } },
    ),
  );
  const client = new PublicGithubClient(fetcher as typeof fetch, () => now);
  const url = "https://api.github.com/repos/sample/project";
  await Promise.all([client.request(url), client.request(url)]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await expect(
    client.request(url + "/git/trees/a", undefined, true),
  ).rejects.toThrow(/paused|reserve/i);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await client.request(url + "/git/trees/b");
  expect(fetcher).toHaveBeenCalledTimes(2);
  now = 4000;
  await client.request(url + "/git/trees/c", undefined, true);
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it("honors Retry-After, stops repeated requests and lets cached metadata work", async () => {
  let now = 1000;
  const fetcher = vi.fn(async (url: string) =>
    url.endsWith("/project")
      ? Response.json({ default_branch: "main" })
      : Response.json(
          { message: "limit" },
          { status: 429, headers: { "retry-after": "20" } },
        ),
  );
  const client = new PublicGithubClient(fetcher as typeof fetch, () => now);
  const url = "https://api.github.com/repos/sample/project";
  await client.request(url);
  expect((await client.request(url + "/branches")).status).toBe(429);
  await expect(client.request(url + "/commits")).rejects.toThrow(
    /retry|resume|limit/i,
  );
  expect((await client.request(url)).status).toBe(200);
  expect(fetcher).toHaveBeenCalledTimes(2);
  now = 22000;
  await client.request(url + "/commits");
  expect(fetcher).toHaveBeenCalledTimes(3);
});

it("preserves secondary cooldown after the primary quota reset", async () => {
  let now = 1000;
  const fetcher = vi.fn(async () =>
    Response.json(
      {},
      {
        status: 429,
        headers: {
          "retry-after": "60",
          "x-ratelimit-reset": "2",
          "x-ratelimit-remaining": "0",
        },
      },
    ),
  );
  const client = new PublicGithubClient(fetcher as typeof fetch, () => now);
  await client.request("https://api.github.com/repos/limited/project");
  now = 3000;
  await expect(
    client.request("https://api.github.com/repos/limited/project/branches"),
  ).rejects.toThrow(/Retry after/i);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
