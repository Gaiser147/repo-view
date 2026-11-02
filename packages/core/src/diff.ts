import type { RepoSnapshot, SnapshotDiff } from './index';
export function compareSnapshots(before:RepoSnapshot,after:RepoSnapshot):SnapshotDiff {
  const a=new Map(before.nodes.filter(n=>n.kind==='file').map(n=>[n.path,n])),b=new Map(after.nodes.filter(n=>n.kind==='file').map(n=>[n.path,n]));
  let added=[...b.keys()].filter(p=>!a.has(p)),removed=[...a.keys()].filter(p=>!b.has(p));const changed=[...b.keys()].filter(p=>a.has(p)&&a.get(p)!.hash!==b.get(p)!.hash),renamed:SnapshotDiff['renamed']=[];
  for(const from of removed){const to=added.find(p=>b.get(p)!.hash===a.get(from)!.hash);if(to){renamed.push({from,to});added=added.filter(p=>p!==to);}}
  removed=removed.filter(p=>!renamed.some(r=>r.from===p));return {added,removed,changed,renamed};
}
