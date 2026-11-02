import { describe, it, expect } from 'vitest';
import { analyzeFiles, parseRepository, compareSnapshots, parseWorkflows, rateSnapshot } from '../packages/core/src/analysis';
import { layoutGraph, morphPosition } from '../packages/core/src/layout';
import { createDemoSnapshot } from '../packages/core/src/demo';

describe('public repository input', () => {
  it('normalizes GitHub URLs and rejects arbitrary hosts, credentials and commands', () => {
    expect(parseRepository('https://github.com/Gaiser147/repo-view.git')).toBe('Gaiser147/repo-view');
    for (const url of ['https://evil.test/a/b', 'https://me:pw@github.com/a/b', 'a/b;rm', '../repo', 'https://github.com/a/b/issues']) expect(() => parseRepository(url)).toThrow();
  });
});
describe('static analysis', () => {
  it('resolves imports, records functions and cycles without executing code', () => {
    const s = analyzeFiles('fixture/repo', 'a'.repeat(40), [
      {path:'src/a.ts',content:'import { b } from "./b"; export function a(x: boolean) { if (x) return b(); return 0; }'},
      {path:'src/b.ts',content:'import { a } from "./a"; export function b() { return a(false); }'},
      {path:'README.md',content:'# Hello'},
      {path:'vendor/skip.ts',content:'throw new Error("never execute")'}
    ]);
    expect(s.nodes.filter(n => n.kind === 'file')).toHaveLength(3);
    expect(s.nodes.find(n => n.name === 'a' && n.kind === 'function')?.complexity).toBe(2);
    expect(s.edges.filter(e => e.kind === 'import')).toHaveLength(2);
    expect(s.edges.some(e => e.kind === 'call')).toBe(true);
    expect(rateSnapshot(s).findings.some(f => f.rule === 'dependency-cycle')).toBe(true);
  });
  it('reports unsupported languages, file limits and unresolved imports truthfully', () => {
    const s=analyzeFiles('a/b','a'.repeat(40),[{path:'a.ts',content:'import foo from "./missing";'}, {path:'big.ts',content:'x'.repeat(512001)}, {path:'lib.py',content:'def run(): pass'}]);
    expect(s.coverage.skipped).toBe(1);
    expect(s.coverage.unresolvedImports).toBe(1);
    expect(s.nodes.find(n=>n.path==='lib.py')?.language).toBe('Python');
    expect(rateSnapshot(s).score).toBeNull();
  });
  it('compares snapshots by contents and maps renames', () => {
    const before=analyzeFiles('a/b','a'.repeat(40),[{path:'old.ts',content:'export const value = 1;'}]);
    const after=analyzeFiles('a/b','b'.repeat(40),[{path:'new.ts',content:'export const value = 1;'}, {path:'add.ts',content:'// new'}]);
    const diff=compareSnapshots(before,after);
    expect(diff.renamed).toEqual([{from:'old.ts',to:'new.ts'}]);
    expect(diff.added).toContain('add.ts');
    expect(diff.removed).not.toContain('old.ts');
  });
  it('parses workflow dependencies and does not invent run results', () => {
    const p=parseWorkflows([{path:'.github/workflows/ci.yml',content:'name: CI\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm run build\n  test:\n    needs: build\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test'}]);
    expect(p.jobs.map(j=>j.name)).toEqual(['build','test']);
    expect(p.edges).toHaveLength(1);
    expect(p.jobs[0].status).toBe('unavailable');
    expect(p.jobs[1].steps).toContain('npm test');
  });
});
describe('deterministic spatial layout', () => {
  it('maintains node identities and anchors across commits with reversible interpolation', () => {
    const a=createDemoSnapshot(0), b=createDemoSnapshot(1);
    const l=layoutGraph(a.nodes), next=layoutGraph(b.nodes);
    const common=a.nodes.find(n=>n.kind==='file' && b.nodes.some(m=>m.id===n.id))!;
    expect(l[common.id]).toEqual(next[common.id]);
    expect(morphPosition(l[common.id],0)).toEqual(l[common.id].cloud);
    expect(morphPosition(l[common.id],1)).toEqual(l[common.id].layers);
    expect(Object.values(l).every(p=>[...p.cloud,...p.layers].every(Number.isFinite))).toBe(true);
  });
  it('demo history changes actual data and has a distinct demo designation', () => {
    const a=createDemoSnapshot(0), b=createDemoSnapshot(7);
    expect(a.demo).toBe(true);
    expect(a.sha).not.toBe(b.sha);
    expect(compareSnapshots(a,b).added.length).toBeGreaterThan(0);
  });
});
