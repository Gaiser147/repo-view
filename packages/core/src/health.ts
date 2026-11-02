import type { Finding, HealthReport, RepoSnapshot } from "./index";

export function cyclicComponents(s: RepoSnapshot): string[][] {
  const files = s.nodes.filter((n) => n.kind === "file").map((n) => n.id),
    out = new Map(files.map((id) => [id, [] as string[]])),
    back = new Map(files.map((id) => [id, [] as string[]]));
  for (const e of s.edges)
    if (e.kind === "import" && out.has(e.source) && out.has(e.target)) {
      out.get(e.source)!.push(e.target);
      back.get(e.target)!.push(e.source);
    }
  const visited = new Set<string>(),
    order: string[] = [];
  for (const root of files) {
    if (visited.has(root)) continue;
    const stack: [string, boolean][] = [[root, false]];
    while (stack.length) {
      const [id, done] = stack.pop()!;
      if (done) {
        order.push(id);
        continue;
      }
      if (visited.has(id)) continue;
      visited.add(id);
      stack.push([id, true]);
      for (const next of out.get(id)!)
        if (!visited.has(next)) stack.push([next, false]);
    }
  }
  visited.clear();
  const components: string[][] = [];
  for (const root of order.reverse()) {
    if (visited.has(root)) continue;
    const group: string[] = [],
      stack = [root];
    visited.add(root);
    while (stack.length) {
      const id = stack.pop()!;
      group.push(id);
      for (const n of back.get(id)!)
        if (!visited.has(n)) {
          visited.add(n);
          stack.push(n);
        }
    }
    if (group.length > 1 || out.get(root)!.includes(root))
      components.push(group);
  }
  return components;
}
export function rateSnapshot(s: RepoSnapshot): HealthReport {
  const findings: Finding[] = [],
    funcs = s.nodes.filter((n) => n.kind === "function"),
    supported = s.nodes.filter(
      (n) => n.kind === "file" && /^(TypeScript|JavaScript)$/.test(n.language),
    );
  const eligible = supported.filter((n) => n.functionAnalyzed),
    canScore = eligible.length > 0 && eligible.length / supported.length >= 0.8;
  for (const n of supported.filter((n) => !n.functionAnalyzed))
    findings.push({
      rule: "analysis-unavailable",
      title: `${n.name}: not analyzed`,
      detail:
        n.analysisError ??
        "File content was skipped. It does not count as healthy code.",
      paths: [n.path],
      severity: "info",
    });
  const complex = funcs.filter((n) => (n.complexity ?? 1) > 10),
    long = funcs.filter((n) => n.loc > 80);
  for (const n of complex)
    findings.push({
      rule: "complexity",
      title: `${n.name}: complexity ${n.complexity}`,
      detail:
        "Threshold: 10 decision paths. Maintainability deducts up to 50 points by affected-function ratio.",
      paths: [n.path],
      severity: "warning",
    });
  for (const n of long)
    findings.push({
      rule: "function-length",
      title: `${n.name}: ${n.loc} lines`,
      detail:
        "Threshold: 80 lines. Maintainability deducts up to 50 points by affected-function ratio.",
      paths: [n.path],
      severity: "warning",
    });
  const cycles = cyclicComponents(s),
    cyclicFiles = new Set(cycles.flat());
  for (const paths of cycles)
    findings.push({
      rule: "dependency-cycle",
      title: `Import cycle · ${paths.length} files`,
      detail: "These files belong to a strongly connected import component.",
      paths,
      severity: "warning",
    });
  if (s.coverage.unresolvedImports)
    findings.push({
      rule: "unresolved-import",
      title: `${s.coverage.unresolvedImports} unresolved local imports`,
      detail:
        "Not included in the dependency score. Dynamic or external calls are not treated as proven local relationships.",
      paths: [],
      severity: "info",
    });
  const completed = s.pipeline.jobs.filter((j) =>
    [
      "success",
      "failure",
      "cancelled",
      "skipped",
      "timed_out",
      "action_required",
      "neutral",
    ].includes(j.status),
  );
  const structurallyValid =
    s.pipeline.jobs.length > 0 &&
    !s.pipeline.warnings.some((w) => w.startsWith("Invalid"));
  const ci =
    structurallyValid && completed.length
      ? Math.round(
          60 +
            (40 *
              completed.reduce(
                (sum, j) =>
                  sum +
                  (j.status === "success"
                    ? 1
                    : j.status === "neutral" ||
                        j.status === "skipped" ||
                        j.status === "cancelled"
                      ? 0.5
                      : 0),
                0,
              )) /
              completed.length,
        )
      : null;
  const categories = [
    {
      name: "Maintainability",
      score: canScore
        ? Math.round(
            100 -
              (50 * complex.length) / Math.max(1, funcs.length) -
              (50 * long.length) / Math.max(1, funcs.length),
          )
        : null,
      weight: 0.4,
      reason:
        "100 − 50 × ratio of functions with complexity > 10 − 50 × ratio longer than 80 lines.",
    },
    {
      name: "Dependencies",
      score: canScore
        ? Math.round(100 - (100 * cyclicFiles.size) / eligible.length)
        : null,
      weight: 0.35,
      reason:
        "100 − percentage of JS/TS files in resolved import cycles. Unresolved imports are reported separately.",
    },
    {
      name: "CI reliability",
      score: ci,
      weight: 0.25,
      reason:
        "60 points for valid job structure; up to 40 for completed job results at this commit. No run means not assessed.",
    },
  ];
  const coverage = s.coverage.total
    ? s.coverage.analyzed / s.coverage.total
    : 0;
  const score =
    categories.every((c) => c.score !== null) && coverage >= 0.8
      ? Math.round(categories.reduce((sum, c) => sum + c.score! * c.weight, 0))
      : null;
  return { score, categories, findings, version: "heuristic-v1", coverage };
}
