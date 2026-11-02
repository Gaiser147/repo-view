import { createApp } from './app';
const app=await createApp();
await app.listen({port:Number(process.env.PORT??3001),host:'0.0.0.0'});
console.log(`repo-view API listening on port ${process.env.PORT??3001}`);
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{app.close().then(()=>process.exit());});
