import { expect, it } from "vitest";
import { analyzeFiles } from "../packages/core/src/analysis";
it("resolves default imports and method calls without linking shadowed parameters", () => {
  const s = analyzeFiles("a/b", "a".repeat(40), [
    { path: "a.ts", content: "export default function hello() { return 1; }" },
    {
      path: "b.ts",
      content:
        'import hi from "./a"; function outer(hi: () => number) { return hi(); } export function run() { return hi(); } class A { save() { return 1; } } class B { save() { return 2; } } const a = new A(); a.save();',
    },
  ]);
  const calls = s.edges.filter((e) => e.kind === "call");
  expect(
    calls.some((e) => e.source === "b.ts#run" && e.target === "a.ts#hello"),
  ).toBe(true);
  expect(
    calls.some((e) => e.source === "b.ts#outer" && e.target === "a.ts#hello"),
  ).toBe(false);
  expect(
    s.nodes.filter((n) => n.kind === "function" && n.name === "save"),
  ).toHaveLength(2);
  expect(calls.some((e) => e.target === "b.ts#A.save")).toBe(true);
});
it("resolves installed versions from supported lockfiles", () => {
  for (const file of [
    {
      path: "package-lock.json",
      content: JSON.stringify({
        packages: { "node_modules/react": { version: "19.1.0" } },
      }),
    },
    {
      path: "pnpm-lock.yaml",
      content:
        "lockfileVersion: '9.0'\nimporters:\n  .:\n    dependencies:\n      react:\n        specifier: ^19\n        version: 19.1.0\n",
    },
    { path: "yarn.lock", content: '"react@^19":\n  version "19.1.0"\n' },
  ]) {
    const s = analyzeFiles("a/b", "a".repeat(40), [
      { path: "package.json", content: '{"dependencies":{"react":"^19"}}' },
      file,
    ]);
    expect(s.dependencies[0].version).toBe("19.1.0");
  }
});

it("uses root lockfile versions instead of unrelated nested dependency versions", () => {
  const s = analyzeFiles("a/b", "a".repeat(40), [
    { path: "package.json", content: '{"dependencies":{"foo":"^2"}}' },
    {
      path: "package-lock.json",
      content: JSON.stringify({
        packages: {
          "node_modules/foo": { version: "2.0.0" },
          "node_modules/bar/node_modules/foo": { version: "1.0.0" },
        },
      }),
    },
  ]);
  expect(s.dependencies.find((d) => d.name === "foo")!.version).toBe("2.0.0");
});
