import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createApp} from './app.mjs';
// 密码从标准输入读取，避免进入命令历史。一次运行输入 JSON 数组，至多两个账号。
let input='';for await(const chunk of process.stdin) {input+=chunk;if(input.length>4096) throw new Error('账号输入过长');}
const users=JSON.parse(input);if(!Array.isArray(users)||users.length<1||users.length>2) throw new Error('请输入1至2个账号');
const dbPath=resolve(process.env.DB_PATH??'./data/garden.sqlite');mkdirSync(dirname(dbPath),{recursive:true});
const app=createApp({dbPath});
try {for(const user of users) app.createUser(user.username,user.password,user.displayName);console.log('账号创建完成，密码不会写入日志。');} finally {app.close();}
