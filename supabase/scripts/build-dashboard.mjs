import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('../dashboard/',import.meta.url));mkdirSync(directory,{recursive:true});
const sources=['helpers.ts','app.ts','index.ts'].map(file=>readFileSync(new URL('../functions/garden/'+file,import.meta.url),'utf8').replace(/^import .*?;\r?\n/gm,''));
writeFileSync(new URL('../dashboard/garden.ts',import.meta.url),'// 自动生成：修改 functions/garden 后运行 scripts/build-dashboard.mjs；不要手改此文件。\n'+sources.join('\n'));
console.log('已生成 supabase/dashboard/garden.ts，可直接粘贴 Dashboard 编辑器。');
