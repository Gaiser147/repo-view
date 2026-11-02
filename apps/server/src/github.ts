import type { Commit, RepoSnapshot } from '../../../packages/core/src/index';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
export interface RepositoryProvider { commits(repository:string,ref?:string,page?:number):Promise<Commit[]>; analyze(repository:string,ref?:string,onProgress?:(s:string)=>void):Promise<RepoSnapshot>; }
export async function github<T>(path:string):Promise<T>{
  const response=await fetch(`https://api.github.com/${path}`,{headers:{Accept:'application/vnd.github+json','User-Agent':'repo-view',...(process.env.GITHUB_TOKEN?{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`}:{})},signal:AbortSignal.timeout(30000)});
  if(!response.ok){if(response.status===403||response.status===429)throw new Error('GitHub rate limit reached. Retry later or configure a server-side GITHUB_TOKEN.');if(response.status===404)throw new Error('Public repository or commit not found.');if(response.status===409)return [] as T;throw new Error(`GitHub returned ${response.status}. Retry this analysis.`);}return response.json() as Promise<T>;
}
export const provider:RepositoryProvider={
  async commits(repository,ref,page=1){const meta=await github<any>(`repos/${repository}`);if(meta.private)throw new Error('Only public repositories are supported.');const values=await github<any[]>(`repos/${repository}/commits?per_page=50&page=${page}${ref?`&sha=${encodeURIComponent(ref)}`:''}`);return values.map(c=>({sha:c.sha,message:c.commit.message.split('\n')[0],date:c.commit.author?.date??'',author:c.commit.author?.name??'Unknown'}));},
  async analyze(repository,ref,onProgress){
    const meta=await github<any>(`repos/${repository}`);if(meta.private)throw new Error('Only public repositories are supported.');
    return new Promise((resolve,reject)=>{
      const path=fileURLToPath(new URL('./worker.ts',import.meta.url));
      const worker=new Worker(`import('tsx/esm/api').then(({tsImport})=>tsImport(${JSON.stringify(path)},${JSON.stringify(import.meta.url)}));`,{eval:true,execArgv:['--use-env-proxy'],workerData:{repository,ref:ref??meta.default_branch,empty:meta.size===0}});
      const timeout=setTimeout(()=>{worker.terminate();reject(new Error('Analysis exceeded 180 seconds. Try a smaller repository.'));},180000);
      worker.on('message',m=>{if(m.progress)onProgress?.(m.progress);else{clearTimeout(timeout);if(m.error)reject(new Error(m.error));else resolve(m.snapshot);worker.terminate();}});
      worker.on('error',e=>{clearTimeout(timeout);reject(e);});
      worker.on('exit',code=>{clearTimeout(timeout);if(code!==0)reject(new Error('Analysis worker stopped. Retry this repository.'));});
    });
  }
};
