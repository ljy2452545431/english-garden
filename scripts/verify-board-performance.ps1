param([switch]$Old, [Parameter(Mandatory=$true)][string]$CliPath)
$ErrorActionPreference='Stop'
$taskOld=if($Old){'true'}else{'false'}
$taskSite=if($Old){'http://localhost:4181/english-garden/'}else{'http://127.0.0.1:4173/english-garden/'}
$taskCode=@"
async page=>{
const old=$taskOld,results=[];
for(const scenario of ['normal','stress']){
const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const p=await context.newPage();p.setDefaultTimeout(120000);
try{
await p.goto('$taskSite');await p.getByRole('button',{name:'先体验站内课程',exact:true}).click();
const bytes=await p.evaluate(async scenario=>{
const make=(kind,patch={})=>({id:crypto.randomUUID(),kind,x:40,y:40,width:140,height:70,rotation:0,fill:kind==='stroke'?'transparent':'#FFF1B8',color:'#283443',fontSize:28,text:'',assetId:null,points:[],...patch});
const strokes=Array.from({length:scenario==='stress'?99:10},(_,i)=>make('stroke',{x:(i%10)*150,y:Math.floor(i/10)*85,points:Array.from({length:scenario==='stress'?2000:200},(_,j)=>[j/(scenario==='stress'?1999:199),(Math.sin(j/20)+1)/2])}));
const shapes=scenario==='stress'?[]:Array.from({length:20},(_,i)=>make('rect',{x:(i%10)*150,y:200+Math.floor(i/10)*100,fill:'#DCE4DB'}));
const document={schema:1,width:1600,height:1000,background:'#F7F8FA',nodes:[...strokes,...shapes,make('note',{x:40,y:40,width:400,height:200,text:'性能测试'})]};
await new Promise((resolve,reject)=>{const request=indexedDB.open('english-garden-art-v1',1);request.onupgradeneeded=()=>{request.result.createObjectStore('drafts');request.result.createObjectStore('images');};request.onerror=reject;request.onsuccess=()=>{const db=request.result,tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put({title:'仅本地性能基线',document},'preview');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=reject;};});return new TextEncoder().encode(JSON.stringify(document)).length;
},scenario);
await p.locator('.bottom-nav').getByRole('button',{name:'我的花园',exact:true}).click();await p.getByRole('button',{name:'打开创作画布',exact:true}).waitFor();
const cdp=await context.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
await p.evaluate(()=>{window.__metrics={tasks:[],gaps:[],puts:[]};new PerformanceObserver(list=>window.__metrics.tasks.push(...list.getEntries().map(e=>e.duration))).observe({type:'longtask'});let last=performance.now();const raf=()=>{const now=performance.now();window.__metrics.gaps.push(now-last);last=now;requestAnimationFrame(raf)};requestAnimationFrame(raf);const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){const start=performance.now();const result=original.apply(this,args);window.__metrics.puts.push(performance.now()-start);return result;};});
const opened=Date.now();await p.getByRole('button',{name:'打开创作画布',exact:true}).click();await p.locator(old?'.board-editor':'.board-stage canvas').first().waitFor();const openMs=Date.now()-opened;
if(old){await p.locator('.board-editor [data-node-id]').last().click();await p.locator('.board-editor').getByRole('button',{name:'设置',exact:true}).click();}else{
const location=await p.evaluate(()=>{const stage=window.Konva.stages.at(-1),groups=stage.find('Group').filter(group=>group.getAttr('boardNodeId')),group=groups.at(-1),rect=stage.container().getBoundingClientRect(),position=group.getAbsolutePosition();return {x:rect.x+position.x,y:rect.y+position.y};});await p.mouse.click(location.x,location.y);await p.getByRole('button',{name:'编辑内容',exact:true}).click();}
const started=Date.now();await p.locator('textarea').pressSequentially('abcdefghij',{delay:60});const typeMs=Date.now()-started;
if(!old)await p.getByRole('button',{name:'完成文字',exact:true}).click();await p.waitForTimeout(800);const completeMs=Date.now()-started;
const metrics=await p.evaluate(()=>({longTasks:window.__metrics.tasks.length,maxTask:Math.max(0,...window.__metrics.tasks),maxRafGap:Math.max(0,...window.__metrics.gaps),puts:window.__metrics.puts.length,maxPut:Math.max(0,...window.__metrics.puts),polylines:document.querySelectorAll('.board-workspace polyline').length,canvases:document.querySelectorAll('.board-stage canvas').length}));results.push({scenario,bytes,cpuRate:6,viewport:'390x844',openMs,typeMs,completeMs,...metrics});
}finally{await context.close();}}
await page.evaluate(result=>window.__bench=result,results);
}
"@
$taskCli=$CliPath
$taskOutput=& node $taskCli -s=perfeditor run-code $taskCode 2>&1
$taskError=[regex]::Match(($taskOutput -join [Environment]::NewLine),'(?s)### Error(.*?)(### Ran|$)')
if($LASTEXITCODE -ne 0 -or $taskError.Success){if($taskError.Success){Write-Output $taskError.Groups[1].Value};throw '画布本机基线验证失败'}
$taskResult=& node $taskCli -s=perfeditor eval 'JSON.stringify(window.__bench)' 2>&1
$taskJson=[regex]::Match(($taskResult -join [Environment]::NewLine),'### Result\s+("[^\r\n]+")').Groups[1].Value | ConvertFrom-Json | ConvertFrom-Json
$taskTarget=if($Old){'.browser-qa/board-before-scenes.json'}else{'.browser-qa/board-after-scenes.json'}
$taskJson | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $taskTarget -Encoding utf8
$taskJson | ConvertTo-Json -Depth 8
