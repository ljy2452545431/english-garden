import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createApp} from './app.mjs';
const dbPath=resolve(process.env.DB_PATH??'./data/garden.sqlite');
mkdirSync(dirname(dbPath),{recursive:true});
const app=createApp({dbPath,origins:(process.env.ALLOWED_ORIGINS??'http://localhost:5173').split(',').map(s=>s.trim()).filter(Boolean),logger:event=>console.warn(JSON.stringify(event)),ai:{provider:process.env.AI_PROVIDER,baseUrl:process.env.AI_BASE_URL,model:process.env.AI_MODEL,apiKey:process.env.AI_API_KEY}});
const port=Number(process.env.PORT??8787);
app.server.listen(port,process.env.HOST??'127.0.0.1',()=>console.log(`英语学习后端已启动，端口 ${port}`));
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>app.server.close(()=>{app.close();process.exit(0);}));
