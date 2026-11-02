import type { PipelineJob } from "./index";
/** Kahn traversal: every job and dependency is visited once, including shared ancestors. */
export function pipelineDepths(jobs: PipelineJob[]) {
  const ids = new Set(jobs.map((j) => j.id)),
    indegree = new Map(jobs.map((j) => [j.id, 0])),
    children = new Map(jobs.map((j) => [j.id, [] as string[]])),
    depths = new Map(jobs.map((j) => [j.id, 0]));
  for (const j of jobs)
    for (const dependency of new Set(j.needs))
      if (ids.has(dependency)) {
        indegree.set(j.id, indegree.get(j.id)! + 1);
        children.get(dependency)!.push(j.id);
      }
  const queue = jobs.filter((j) => indegree.get(j.id) === 0).map((j) => j.id);
  let cursor = 0;
  while (cursor < queue.length) {
    const id = queue[cursor++];
    for (const child of children.get(id)!) {
      depths.set(child, Math.max(depths.get(child)!, depths.get(id)! + 1));
      indegree.set(child, indegree.get(child)! - 1);
      if (indegree.get(child) === 0) queue.push(child);
    }
  }
  return {
    depths,
    cycles: jobs.filter((j) => indegree.get(j.id)! > 0).map((j) => j.id),
  };
}
