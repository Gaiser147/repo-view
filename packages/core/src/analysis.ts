import ts from 'typescript';
import { parseDocument } from 'yaml';
import type { CodeEdge, CodeNode, PipelineGraph, RepoSnapshot, SnapshotDiff, SourceFile } from './index';
import { hash } from './layout';
export { rateSnapshot } from './health';

export function parseRepository(input:string):string {
  let value=input.trim();
  if(value.startsWith('https://')){const url=new URL(value);if(url.hostname!=='github.com'||url.port||url.username||url.password||url.search||url.hash)throw new Error('Use a public github.com/owner/repository URL.');value=url.pathname.slice(1);}
  value=value.replace(/\.git$/,'').replace(/\/$/,'');
  if(!/^[A-Za-z0-9][A-Za-z0-9_-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(value))throw new Error('Use a public github.com/owner/repository URL.');
  return value;
}
export const excluded=(p:string)=>p.split('/').some(s=>['.git','node_modules','vendor','dist','build','coverage'].includes(s));
export function languageFor(path:string):string {const ext=path.split('.').pop()?.toLowerCase();return ({ts:'TypeScript',tsx:'TypeScript',js:'JavaScript',jsx:'JavaScript',mjs:'JavaScript',cjs:'JavaScript',mts:'TypeScript',cts:'TypeScript',json:'JSON',css:'CSS',scss:'CSS',md:'Markdown',yml:'YAML',yaml:'YAML',py:'Python',rs:'Rust',go:'Go',java:'Java',html:'HTML',svg:'SVG'} as Record<string,string>)[ext??'']??'Other';}
function normalize(path:string):string {const parts:string[]=[];for(const p of path.split('/')){if(p==='..')parts.pop();else if(p&&p!=='.')parts.push(p);}return parts.join('/');}
function resolveImport(path:string,ref:string,paths:Set<string>):string|undefined {
  const base=normalize(`${path.split('/').slice(0,-1).join('/')}/${ref}`), candidates=[base,...['.ts','.tsx','.js','.jsx','.mts','.cts','.mjs','.cjs','/index.ts','/index.tsx','/index.js'].map(ext=>base+ext)];
  if(/\.js$/.test(base)) candidates.push(base.slice(0,-3)+'.ts',base.slice(0,-3)+'.tsx');
  return candidates.find(c=>paths.has(c));
}
export function parseWorkflows(files:SourceFile[]):PipelineGraph {
  const graph:PipelineGraph={jobs:[],edges:[],warnings:[]};
  for(const f of files.filter(f=>/^\.github\/workflows\/[^/]+\.ya?ml$/.test(f.path)&&f.content!==undefined)){
    try{const doc=parseDocument(f.content!,{uniqueKeys:true});if(doc.errors.length)throw new Error('YAML parse error');const yaml=doc.toJS({maxAliasCount:20}) as any;if(!yaml?.jobs||typeof yaml.jobs!=='object')throw new Error('Missing jobs');
      for(const [key,j]of Object.entries(yaml.jobs) as [string,any][]){if(!j||typeof j!=='object')throw new Error('Invalid job');const needs=(Array.isArray(j.needs)?j.needs:j.needs?[j.needs]:[]).map(String),id=`${f.path}:${key}`;
        graph.jobs.push({id,name:String(j.name??key),workflow:String(yaml.name??f.path.split('/').pop()),needs:needs.map((n:string)=>`${f.path}:${n}`),steps:Array.isArray(j.steps)?j.steps.map((s:any)=>String(s?.name??s?.uses??s?.run??'Unnamed step')):[],status:'unavailable',condition:j.if?String(j.if):undefined,reusable:j.uses?String(j.uses):undefined});
        for(const need of needs)graph.edges.push({source:`${f.path}:${need}`,target:id});
      }
    }catch{graph.warnings.push(`Invalid workflow: ${f.path}`);}
  }
  for(const e of graph.edges)if(!graph.jobs.some(j=>j.id===e.source))graph.warnings.push(`Invalid needs reference: ${e.source}`);
  return graph;
}
export function analyzeFiles(repository:string,sha:string,input:SourceFile[]):RepoSnapshot {
  const eligible=input.filter(f=>!excluded(f.path)), files=eligible.slice(0,5000), nodes:CodeNode[]=[], edges:CodeEdge[]=[], paths=new Set(files.map(f=>f.path));
  let bytes=0, analyzed=0, skipped=eligible.length-files.length, supported=0, unresolvedImports=0;
  const asts=new Map<string,ts.SourceFile>(), importMaps=new Map<string,Map<string,{path:string;name:string}>>(), functions=new Map<string,Map<string,string>>(), dependencies:RepoSnapshot['dependencies']=[];
  const addEdge=(source:string,target:string,kind:CodeEdge['kind'])=>{const id=`${kind}:${source}>${target}`;if(!edges.some(e=>e.id===id))edges.push({id,source,target,kind});};
  for(const f of files){const size=f.size??new TextEncoder().encode(f.content??'').length, language=languageFor(f.path), readable=f.content!==undefined&&!f.content.includes('\0')&&size<=512000&&bytes+size<=20*1024*1024;
    const group=f.path.includes('/')?f.path.split('/')[0]:'root';
    if(!nodes.some(n=>n.id===`pkg:${group}`))nodes.push({id:`pkg:${group}`,name:group,path:group,kind:'package',group,language:'Package',bytes:0,loc:0,hash:''});
    const content=readable?f.content!:'',node:CodeNode={id:f.path,name:f.path.split('/').pop()!,path:f.path,kind:'file',group,language,bytes:size,loc:readable?content.split(/\r?\n/).filter(l=>l.trim()).length:0,hash:f.hash??String(hash(f.content??String(size))),parent:`pkg:${group}`,analyzed:readable};nodes.push(node);addEdge(`pkg:${group}`,node.id,'contains');
    if(!readable){skipped++;continue;}bytes+=size;analyzed++;
    if(/^(TypeScript|JavaScript)$/.test(language)){supported++;asts.set(f.path,ts.createSourceFile(f.path,content,ts.ScriptTarget.Latest,true,f.path.endsWith('x')?ts.ScriptKind.TSX:language==='JavaScript'?ts.ScriptKind.JS:ts.ScriptKind.TS));}
    if(f.path.endsWith('package.json'))try{const p=JSON.parse(content);for(const [field,dev]of [['dependencies',false],['devDependencies',true]] as const)for(const [name,version]of Object.entries(p[field]??{}))dependencies.push({name,version:String(version),dev});}catch{/* malformed manifest remains visible */}
  }
  for(const [path,ast]of asts){const imports=new Map<string,{path:string;name:string}>(), defs=new Map<string,string>();importMaps.set(path,imports);functions.set(path,defs);let anon=0;
    const visit=(n:ts.Node,scope='')=>{
      if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier&&ts.isStringLiteral(n.moduleSpecifier)){
        const spec=n.moduleSpecifier.text, target=spec.startsWith('.')?resolveImport(path,spec,paths):undefined;
        if(target){addEdge(path,target,'import');if(ts.isImportDeclaration(n)){const c=n.importClause;if(c?.name)imports.set(c.name.text,{path:target,name:'default'});if(c?.namedBindings&&ts.isNamedImports(c.namedBindings))for(const el of c.namedBindings.elements)imports.set(el.name.text,{path:target,name:el.propertyName?.text??el.name.text});}}
        else if(spec.startsWith('.'))unresolvedImports++;
      }
      if(ts.isFunctionDeclaration(n)||ts.isFunctionExpression(n)||ts.isArrowFunction(n)||ts.isMethodDeclaration(n)){
        const raw=n.name?.getText(ast)??(ts.isVariableDeclaration(n.parent)?n.parent.name.getText(ast):`anonymous${++anon}`),name=scope?`${scope}.${raw}`:raw,id=`${path}#${name}`;
        let complexity=1;const count=(child:ts.Node)=>{if(child!==n&&ts.isFunctionLike(child))return;if(ts.isIfStatement(child)||ts.isConditionalExpression(child)||ts.isForStatement(child)||ts.isForInStatement(child)||ts.isForOfStatement(child)||ts.isWhileStatement(child)||ts.isDoStatement(child)||ts.isCaseClause(child)||ts.isCatchClause(child))complexity++;if(ts.isBinaryExpression(child)&&[ts.SyntaxKind.AmpersandAmpersandToken,ts.SyntaxKind.BarBarToken,ts.SyntaxKind.QuestionQuestionToken].includes(child.operatorToken.kind))complexity++;ts.forEachChild(child,count);};count(n);
        const line=ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1,end=ast.getLineAndCharacterOfPosition(n.end).line+1;
        if(!nodes.some(v=>v.id===id)){nodes.push({id,name:raw,path,kind:'function',group:nodes.find(v=>v.id===path)!.group,language:languageFor(path),bytes:n.end-n.pos,loc:end-line+1,hash:String(hash(n.getText(ast))),parent:path,line,complexity});defs.set(raw,id);addEdge(path,id,'contains');}
        ts.forEachChild(n,c=>visit(c,name));return;
      }ts.forEachChild(n,c=>visit(c,scope));
    };visit(ast);
  }
  for(const [path,ast]of asts){const visit=(n:ts.Node,caller:string=path)=>{if(ts.isFunctionDeclaration(n)||ts.isFunctionExpression(n)||ts.isArrowFunction(n)||ts.isMethodDeclaration(n)){const raw=n.name?.getText(ast)??(ts.isVariableDeclaration(n.parent)?n.parent.name.getText(ast):'');caller=functions.get(path)?.get(raw)??caller;}
    if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)){const name=n.expression.text,imp=importMaps.get(path)?.get(name),target=functions.get(path)?.get(name)??(imp?functions.get(imp.path)?.get(imp.name):undefined);if(target)addEdge(caller,target,'call');}
    ts.forEachChild(n,c=>visit(c,caller));};visit(ast);}
  for(const p of nodes.filter(n=>n.kind==='package')){const children=nodes.filter(n=>n.parent===p.id);p.loc=children.reduce((s,n)=>s+n.loc,0);p.bytes=children.reduce((s,n)=>s+n.bytes,0);}
  return {repository,sha,nodes,edges,coverage:{total:eligible.length,analyzed,skipped,supported,unresolvedImports,partial:skipped>0},pipeline:parseWorkflows(files),dependencies,demo:false};
}
export { compareSnapshots } from './diff';
