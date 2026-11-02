import { z } from "zod";
export const analysisRequest = z.object({
  priority: z.enum(["foreground", "background"]).optional(),
  repository: z.string().min(3).max(300),
  ref: z
    .string()
    .regex(/^[a-zA-Z0-9_./-]{1,150}$/)
    .optional(),
});
export type Vec3 = [number, number, number];
export type NodeKind = "package" | "file" | "function";
export interface CodeNode {
  id: string;
  name: string;
  path: string;
  kind: NodeKind;
  group: string;
  language: string;
  bytes: number;
  loc: number;
  hash: string;
  parent?: string;
  line?: number;
  complexity?: number;
  analyzed?: boolean;
  functionAnalyzed?: boolean;
  analysisError?: string;
}
export interface CodeEdge {
  id: string;
  source: string;
  target: string;
  kind: "import" | "call" | "contains" | "dependency";
}
export interface SourceFile {
  path: string;
  content?: string;
  size?: number;
  hash?: string;
}
export interface Coverage {
  total: number;
  analyzed: number;
  skipped: number;
  supported: number;
  unresolvedImports: number;
  partial: boolean;
}
export interface PipelineJob {
  id: string;
  name: string;
  workflow: string;
  needs: string[];
  steps: string[];
  status: string;
  condition?: string;
  reusable?: string;
  url?: string;
}
export interface PipelineGraph {
  jobs: PipelineJob[];
  edges: { source: string; target: string }[];
  warnings: string[];
  runUrl?: string;
}
export interface Finding {
  rule: string;
  title: string;
  detail: string;
  paths: string[];
  severity: "info" | "warning" | "error";
}
export interface HealthReport {
  score: number | null;
  categories: {
    name: string;
    score: number | null;
    weight: number;
    reason: string;
  }[];
  findings: Finding[];
  version: string;
  coverage: number;
}
export interface RepoSnapshot {
  analyzedAt?: string;
  repository: string;
  sha: string;
  nodes: CodeNode[];
  edges: CodeEdge[];
  coverage: Coverage;
  pipeline: PipelineGraph;
  demo: boolean;
  dependencies: {
    name: string;
    version: string;
    dev: boolean;
    manifest?: string;
  }[];
}
export interface Commit {
  sha: string;
  message: string;
  date: string;
  author: string;
}
export interface SnapshotDiff {
  added: string[];
  removed: string[];
  changed: string[];
  renamed: { from: string; to: string }[];
}
export interface NodePosition {
  cloud: Vec3;
  layers: Vec3;
  focus: Vec3;
}
export type Layout = Record<string, NodePosition>;
