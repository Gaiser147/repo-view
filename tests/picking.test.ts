import {expect,it} from 'vitest';
import {nearestScreenNode} from '../packages/core/src/picking';
import {layoutGraph} from '../packages/core/src/layout';
import {createDemoSnapshot} from '../packages/core/src/demo';
it('picks the closest visible screen point within a generous touch radius',()=>{
 expect(nearestScreenNode(100,100,[{id:'far',x:111,y:100,z:-.8},{id:'near',x:101,y:100,z:.4},{id:'hidden',x:100,y:100,z:2}],24)).toBe('near');
 expect(nearestScreenNode(100,100,[{id:'outside',x:140,y:100,z:0}],24)).toBeNull();
});
it('places function details close to their owning file',()=>{
 const s=createDemoSnapshot(),layout=layoutGraph(s.nodes),fn=s.nodes.find(n=>n.kind==='function')!;const a=layout[fn.id].cloud,b=layout[fn.parent!].cloud;
 expect(Math.hypot(...a.map((v,i)=>v-b[i]))).toBeLessThan(1);
});
