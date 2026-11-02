import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { Layout, Vec3 } from '../../../packages/core/src/index';
import { hash, layoutGraph } from '../../../packages/core/src/layout';
import { useRepo } from './state';

import { palette, groupColor } from './colors';
const vertex=`attribute float size; attribute vec3 tint; varying vec3 vTint; void main(){ vTint=tint; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=clamp(size*230./-mv.z,1.,48.); gl_Position=projectionMatrix*mv; }`;
const fragment=`varying vec3 vTint; void main(){ float d=length(gl_PointCoord-vec2(.5))*2.; if(d>1.)discard; float core=exp(-d*d*32.);float glow=pow(1.-d,2.)*.32;gl_FragColor=vec4(vTint*(1.+core*1.5),core+glow); }`;
class GraphBoundary extends Component<{children:ReactNode},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return {error:true};}render(){return this.state.error?<div className="graph-fallback"><h2>Spatial view unavailable</h2><p>Your browser could not start WebGL. Explore the same repository using Files and the Inspector.</p><button onClick={()=>useRepo.getState().set({filesOpen:true})}>Open files</button></div>:this.props.children;}}
function Cloud({layout}:{layout:Layout}){
 const {snapshot,selectedId,focus,view,color,metric,paused,lowPower,reducedMotion,layerRules}=useRepo(),groups=useMemo(()=>snapshot.nodes.filter(n=>n.kind==='package').map(n=>n.group),[snapshot]);
 const {camera}=useThree(),points=useRef<THREE.Points>(null),lines=useRef<THREE.LineSegments>(null),labels=useRef<Record<string,THREE.Group|null>>({}),transition=useRef(0),focusT=useRef(0),clock=useRef(0),frames=useRef({time:0,count:0});
 const selected=snapshot.nodes.find(n=>n.id===selectedId),[detailed,setDetailed]=useState(false);
 const nodes=useMemo(()=>snapshot.nodes.filter(n=>n.kind==='file'||(n.kind==='function'&&(view==='Functions'||n.group===focus||n.parent===selectedId)&&detailed)),[snapshot,view,focus,selectedId,detailed]);
 const index=useMemo(()=>new Map(nodes.map((n,i)=>[n.id,i])),[nodes]);
 const links=useMemo(()=>snapshot.edges.filter(e=>index.has(e.source)&&index.has(e.target)&&(view==='Functions'?e.kind==='call':e.kind==='import'||(selectedId&&(e.source===selectedId||e.target===selectedId)))).slice(0,12000),[snapshot,index,view,selectedId]);
 const dustCount=lowPower?600:2600,total=nodes.length+dustCount;
 const geo=useMemo(()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(total*3),3));g.setAttribute('tint',new THREE.BufferAttribute(new Float32Array(total*3),3));g.setAttribute('size',new THREE.BufferAttribute(new Float32Array(total),1));return g;},[total]);
 const lineGeo=useMemo(()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(links.length*6),3));g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(links.length*6),3));return g;},[links]);
 useEffect(()=>()=>{geo.dispose();lineGeo.dispose();},[geo,lineGeo]);
 const colors=useMemo(()=>groups.map((g)=>new THREE.Color(groupColor(g,groups))),[groups]);
 const changed=useRepo(s=>s.diff),changedPaths=useMemo(()=>new Set([...(changed?.added??[]),...(changed?.changed??[])]),[changed]);
 useFrame((_,dt)=>{
   const target=useRepo.getState().layout==='layers'?1:0,t=transition.current;
   transition.current=reducedMotion?target:THREE.MathUtils.damp(t,target,4,Math.min(dt,.05));if(Math.abs(transition.current-target)<.0005)transition.current=target;
   focusT.current=reducedMotion?(focus?1:0):THREE.MathUtils.damp(focusT.current,focus?1:0,4,Math.min(dt,.05));
   if(!paused&&!reducedMotion)clock.current+=dt;
   if(frames.current.count++%30===0){const next=camera.position.length()<17;if(next!==detailed)setDetailed(next);}
   frames.current.time+=dt;if(frames.current.count===180&&!lowPower&&frames.current.time>9)useRepo.getState().set({lowPower:true});
   const pos=geo.attributes.position.array as Float32Array,tints=geo.attributes.tint.array as Float32Array,sizes=geo.attributes.size.array as Float32Array,morph=transition.current;
   const position=(id:string,group:string):Vec3=>{const p=layout[id];if(!p)return [0,0,0];let layer=p.layers;const rule=layerRules[group];if(rule!==undefined)layer=[layer[0],(1.5-Number(rule))*3.8,layer[2]];const f=focus===group?focusT.current*(1-morph):0;return p.cloud.map((v,i)=>THREE.MathUtils.lerp(THREE.MathUtils.lerp(v,p.focus[i],f),layer[i],morph)) as Vec3;};
   for(let i=0;i<nodes.length;i++){const n=nodes[i],p=position(n.id,n.group);pos.set(p,i*3);let c=colors[Math.max(0,groups.indexOf(n.group))%colors.length]??new THREE.Color('#45bfff');
     if(color==='complexity')c=new THREE.Color((n.complexity??0)>10?'#ffb76b':'#579fff');if(color==='language')c=new THREE.Color(n.language==='TypeScript'?'#4fa9ff':n.language==='JavaScript'?'#f4d16b':'#8ce3cd');if(color==='changes')c=new THREE.Color(changedPaths.has(n.path)?'#6ff5cf':'#54779c');
     const active=n.id===selectedId||n.parent===selectedId,dim=focus&&focus!==n.group?.toString()? .24:1;
     tints.set(active?[.45,1,.83]:[c.r*dim,c.g*dim,c.b*dim],i*3);sizes[i]=active?1.8:n.kind==='function'?.35:.48+Math.min(1.1,Math.sqrt(n[metric])/ (metric==='loc'?22:145));
   }
   // Atmospheric specks are a non-interactive material, not additional repository entities.
   for(let d=0;d<dustCount;d++){const base=nodes[d%Math.max(1,nodes.length)],i=nodes.length+d;if(!base){pos.set([0,0,0],i*3);sizes[i]=0;continue;}const p=position(base.id,base.group),r=hash('dust'+d)/4294967295,a=d*2.39996,w=(1-morph)*(.2+r*.6);pos.set([p[0]+Math.sin(a)*w,p[1]+Math.cos(a*1.3)*w,p[2]+Math.sin(a*.7)*w],i*3);const c=colors[Math.max(0,groups.indexOf(base.group))%colors.length];tints.set([c.r*.35,c.g*.35,c.b*.35],i*3);sizes[i]=.16+r*.16;}
   geo.attributes.position.needsUpdate=true;geo.attributes.tint.needsUpdate=true;geo.attributes.size.needsUpdate=true;
   const lp=lineGeo.attributes.position.array as Float32Array,lc=lineGeo.attributes.color.array as Float32Array;
   for(let i=0;i<links.length;i++){const e=links[i],a=index.get(e.source)!,b=index.get(e.target)!,active=e.source===selectedId||e.target===selectedId;lp.set(pos.subarray(a*3,a*3+3),i*6);lp.set(pos.subarray(b*3,b*3+3),i*6+3);const power=active?.8:(view==='Dependencies'?.19:.085);lc.set(active?[.3,power,power,.3,power,power]:[power*.25,power*.65,power,power*.25,power*.65,power],i*6);}
   lineGeo.attributes.position.needsUpdate=true;lineGeo.attributes.color.needsUpdate=true;
   for(const group of groups){const label=labels.current[group];if(!label)continue;const p=position(`pkg:${group}`,group);label.position.set(p[0],p[1]+2.9,p[2]);}
 });
 return <>
  <points ref={points} geometry={geo} frustumCulled={false} onClick={e=>{e.stopPropagation();if(e.index!==undefined&&e.index<nodes.length)useRepo.getState().select(nodes[e.index].id);}}><shaderMaterial vertexShader={vertex} fragmentShader={fragment} transparent depthWrite={false} blending={THREE.AdditiveBlending}/></points>
  <lineSegments ref={lines} geometry={lineGeo} frustumCulled={false}><lineBasicMaterial vertexColors transparent opacity={.8} depthWrite={false} blending={THREE.AdditiveBlending}/></lineSegments>
  {groups.map((g,i)=><group key={g} ref={el=>{labels.current[g]=el;}}><Html center zIndexRange={[3,0]} distanceFactor={27}><button className={`cluster-label ${focus===g?'focused':''}`} style={{'--cluster':palette[i%palette.length]} as React.CSSProperties} onClick={()=>useRepo.getState().select(`pkg:${g}`)}><span className="cluster-dot"/>{g}<small>{snapshot.nodes.filter(n=>n.kind==='file'&&n.group===g).length} files</small></button></Html></group>)}
 </>;
}
function Camera(){const controls=useRef<any>(null),rev=useRepo(s=>s.cameraRevision),selectedId=useRepo(s=>s.selectedId),focus=useRepo(s=>s.focus),{camera}=useThree();useEffect(()=>{if(controls.current){controls.current.target.set(0,0,0);camera.position.set(0,1,window.innerWidth<700?36:22);controls.current.update();}},[rev,camera]);
 useEffect(()=>{if(selectedId||focus)controls.current?.update();},[selectedId,focus]);
 return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.08} minDistance={5} maxDistance={55} maxPolarAngle={Math.PI*.9} />;
}
export function Graph(){const {snapshot,lowPower}=useRepo(),[layout,setLayout]=useState<Layout>(()=>layoutGraph(snapshot.nodes));
 useEffect(()=>{const worker=new Worker(new URL('./layout.worker.ts',import.meta.url),{type:'module'});worker.onmessage=e=>setLayout(e.data);worker.postMessage(snapshot.nodes);return()=>worker.terminate();},[snapshot]);
 return <GraphBoundary><Suspense fallback={<div className="graph-fallback">Preparing spatial view…</div>}><Canvas camera={{position:[0,1,window.innerWidth<700?36:22],fov:48,near:.1,far:150}} dpr={lowPower?1:[1,1.6]} gl={{antialias:false,alpha:true,powerPreference:'high-performance'}} onPointerMissed={()=>useRepo.getState().select(null)} onCreated={({raycaster})=>{raycaster.params.Points={threshold:.13};}}><Cloud layout={layout}/><Camera/>{!lowPower&&<EffectComposer multisampling={0}><Bloom intensity={1.05} luminanceThreshold={.75} luminanceSmoothing={.6} mipmapBlur/></EffectComposer>}</Canvas></Suspense></GraphBoundary>;
}
