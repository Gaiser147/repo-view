import type { CodeEdge, CodeNode, Commit, RepoSnapshot } from './index';
import { hash } from './layout';
export const demoCommits:Commit[]=Array.from({length:50},(_,i)=>({sha:hash(`commit-${i}`).toString(16).padStart(8,'0').repeat(5),message:[ 'chore: initialize workspace','feat: add authentication flow','refactor: extract shared components','test: cover checkout edge cases','feat: improve search indexing','fix: handle expired sessions','feat: add payment retries','perf: cache repository snapshots'][i%8],date:new Date(Date.UTC(2026,9,1+i,10+(i%8),24)).toISOString(),author:['Alex Morgan','Sam Rivera','Jamie Chen'][i%3]})).reverse();
const groups=['apps','packages','services','tests','infra','.github'];
const folders:Record<string,string[]>= {apps:['web/components','web/hooks','web/pages','api/routes','api/middleware'],packages:['ui','utils','types','config','sdk'],services:['auth','payments','notifications','search','storage'],tests:['unit','integration','e2e','fixtures'],infra:['terraform','docker','scripts'],'.github':['workflows','actions']};
const names=['session','checkout','user','client','request','provider','cache','router','payment','account','search','settings','analytics','handler','schema','token','context','logger','validator','store'];
export function createDemoSnapshot(index=49):RepoSnapshot {
  index=Math.max(0,Math.min(49,index));const nodes:CodeNode[]=[],edges:CodeEdge[]=[];
  for(const group of groups){const pid=`pkg:${group}`;nodes.push({id:pid,name:group,path:group,kind:'package',group,language:'Package',bytes:0,loc:0,hash:''});
    const count=group==='.github'?12:group==='infra'?34:90+Math.floor(index/4);
    for(let i=0;i<count;i++){const folder=folders[group][i%folders[group].length],name=`${names[i%names.length]}${Math.floor(i/names.length)||''}.${group==='infra'?'yml':'ts'}`,path=`${group}/${folder}/${name}`,loc=35+hash(path)%310;
      nodes.push({id:path,name,path,kind:'file',group,language:group==='infra'?'YAML':'TypeScript',bytes:loc*34,loc,hash:String(hash(path+Math.floor(index/(i%7+3)))),parent:pid,analyzed:true});edges.push({id:`contains:${path}`,source:pid,target:path,kind:'contains'});
      if(group!=='infra'&&group!=='.github')for(let j=0;j<3;j++){const fn=['create','get','validate'][j]+names[i%names.length][0].toUpperCase()+names[i%names.length].slice(1),id=`${path}#${fn}`;nodes.push({id,name:fn,path,kind:'function',group,language:'TypeScript',bytes:200,loc:10+hash(id)%70,hash:String(hash(id)),parent:path,line:5+j*23,complexity:1+hash(id)%13});edges.push({id:`fn:${id}`,source:path,target:id,kind:'contains'});}
    }
  }
  const files=nodes.filter(n=>n.kind==='file');
  for(let i=0;i<files.length;i++){for(let k=0;k<2;k++){const j=(i+(k?67:1))%files.length;edges.push({id:`import:${i}:${k}`,source:files[i].id,target:files[j].id,kind:'import'});}const a=nodes.find(n=>n.parent===files[i].id&&n.kind==='function'),b=nodes.find(n=>n.parent===files[(i+1)%files.length].id&&n.kind==='function');if(a&&b)edges.push({id:`call:${i}`,source:a.id,target:b.id,kind:'call'});}
  // Keep a small, clearly visible cycle rather than falsely implying all demo modules are healthy.
  edges.splice(0,0,{id:'cycle-demo',source:files[1].id,target:files[0].id,kind:'import'});
  for(const p of nodes.filter(n=>n.kind==='package')){const children=files.filter(n=>n.group===p.group);p.bytes=children.reduce((s,n)=>s+n.bytes,0);p.loc=children.reduce((s,n)=>s+n.loc,0);}
  const chronological=[...demoCommits].reverse();
  return {repository:'acme/atlas-commerce',sha:chronological[index].sha,nodes,edges,demo:true,coverage:{total:files.length,analyzed:files.length,skipped:0,supported:files.filter(n=>n.language==='TypeScript').length,unresolvedImports:3,partial:false},dependencies:[{name:'react',version:'^19.0.0',dev:false},{name:'typescript',version:'^5.9.0',dev:true},{name:'zod',version:'^4.0.0',dev:false},{name:'vitest',version:'^4.0.0',dev:true}],pipeline:{jobs:['Install','Lint','Test','Build','Deploy'].map((name,i)=>({id:`demo:${name}`,name,workflow:'Continuous integration',needs:i?[`demo:${['Install','Lint','Test','Build'][i-1]}`]:[],steps:[['npm ci','Install dependencies'],['npm run lint','Check source'],['npm test','Run unit tests'],['npm run build','Compile production bundle'],['Deploy preview','Publish artifact']][i],status:index===46&&i===2?'failure':index===46&&i>2?'skipped':'success'})),edges:['Lint','Test','Build','Deploy'].map((name,i)=>({source:`demo:${['Install','Lint','Test','Build'][i]}`,target:`demo:${name}`})),warnings:[]}};
}
