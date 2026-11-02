import { create } from 'zustand';
import type { RepoSnapshot, Commit, SnapshotDiff } from '../../../packages/core/src/index';
import { createDemoSnapshot, demoCommits } from '../../../packages/core/src/demo';
import { compareSnapshots } from '../../../packages/core/src/diff';
export type View='Explore'|'Dependencies'|'Functions'|'Pipelines';
interface State {
 snapshot:RepoSnapshot; commits:Commit[]; selectedId:string|null; focus:string|null; layout:'cloud'|'layers'; view:View; color:'module'|'complexity'|'language'|'changes'; metric:'loc'|'bytes'; paused:boolean; lowPower:boolean; reducedMotion:boolean; playing:boolean; filesOpen:boolean; inspector:'node'|'health'|null; query:string; pending:boolean; progress:string; error:string|null; diff:SnapshotDiff|null; branch:string; cameraRevision:number; layerRules:Record<string,string>;
 set:(patch:Partial<State>)=>void; select:(id:string|null)=>void; replace:(s:RepoSnapshot,commits?:Commit[])=>void;
}
export const useRepo=create<State>((set,get)=>({snapshot:createDemoSnapshot(49),commits:demoCommits,selectedId:null,focus:null,layout:'cloud',view:'Explore',color:'module',metric:'loc',paused:false,lowPower:false,reducedMotion:typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches,playing:false,filesOpen:typeof window==='undefined'||window.innerWidth>700,inspector:null,query:'',pending:false,progress:'',error:null,diff:null,branch:'main',cameraRevision:0,layerRules:{},
 set:patch=>set(patch),select:id=>set({selectedId:id,inspector:id?'node':null,query:''}),
 replace:(s,commits)=>{const prev=get().snapshot,same=prev.repository===s.repository;set({snapshot:s,commits:commits??get().commits,diff:same?compareSnapshots(prev,s):null,selectedId:same&&s.nodes.some(n=>n.id===get().selectedId)?get().selectedId:null,focus:same?get().focus:null,pending:false,error:null,query:''});}
}));
let generation=0;
export async function json<T>(url:string,init?:RequestInit):Promise<T>{const res=await fetch(url,init);const value=await res.json();if(!res.ok)throw new Error(value.error??`Request failed (${res.status}).`);return value;}
export async function loadRepository(repository:string,ref?:string,branch='main'){
 const ticket=++generation,store=useRepo.getState();store.set({pending:true,progress:'Connecting to GitHub…',error:null,playing:false});
 try{
  const [job,history]=await Promise.all([json<{id:string}>('/api/analyses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({repository,ref:ref??(branch!=='main'?branch:undefined)})}),ref?Promise.resolve(null):json<{commits:Commit[]}>(`/api/repos/${repository}/commits${branch!=='main'?`?ref=${encodeURIComponent(branch)}`:''}`)]);
  const deadline=Date.now()+190000;
  while(Date.now()<deadline){if(ticket!==generation)return;const result=await json<{status:string;progress:string;error?:string;snapshot?:RepoSnapshot}>(`/api/analyses/${job.id}`);if(ticket!==generation)return;
   if(result.status==='error')throw new Error(result.error);if(result.snapshot){useRepo.getState().replace(result.snapshot,history?.commits);useRepo.getState().set({branch});return;}
   store.set({progress:result.progress});await new Promise(r=>setTimeout(r,500));
  }throw new Error('Analysis timed out. Retry or choose a smaller repository.');
 }catch(e){if(ticket===generation)store.set({pending:false,error:e instanceof Error?e.message:'Analysis failed.',playing:false});}
}
export function loadCommit(sha:string){const s=useRepo.getState();if(s.snapshot.demo){const index=[...demoCommits].reverse().findIndex(c=>c.sha===sha);s.replace(createDemoSnapshot(index));return Promise.resolve();}return loadRepository(s.snapshot.repository,sha,s.branch);}
export function openDemo(){generation++;useRepo.getState().replace(createDemoSnapshot(49),demoCommits);useRepo.getState().set({branch:'main',pending:false,playing:false,error:null,inspector:null});}
