export type Review = { interval: number; due: string; reviews: number };
export type Attempt = { correct: number; total: number; date: string; wrongIds: string[] };
export type LearningState = {
  startDate: string; completed: number[]; dates: string[];
  reviews: Record<string, Review>; notes: Record<string, string>;
  attempts: Record<string, Attempt>; checks: Record<string, boolean>;
  /** 按周和技能保存尚未提交或已提交的选择，重新练习时清空对应课程。 */
  answers: Record<string, Record<string, number>>;
  nickname: string;
};
export const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
/** 校验真实日历日期，防止 JavaScript 将 2 月 30 日自动滚到 3 月。 */
function validDate(value:unknown):value is string {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.startsWith('0000'))return false;
  const date=new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function object(value:unknown):Record<string,unknown> {
  return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
}
function nonnegativeInteger(value:unknown):value is number {
  return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
}
function normalizeReviews(value:unknown):Record<string,Review> {
  return Object.fromEntries(Object.entries(object(value)).flatMap(([key,value])=>{
    const entry=object(value);
    if(!nonnegativeInteger(entry.interval)||entry.interval<1||entry.interval>60||!validDate(entry.due)||!nonnegativeInteger(entry.reviews))return [];
    return [[key,{interval:entry.interval,due:entry.due,reviews:entry.reviews}]];
  }));
}
function normalizeAttempts(value:unknown):Record<string,Attempt> {
  return Object.fromEntries(Object.entries(object(value)).flatMap(([key,value])=>{
    const entry=object(value);
    if(!nonnegativeInteger(entry.correct)||!nonnegativeInteger(entry.total)||entry.correct>entry.total||!validDate(entry.date)||!Array.isArray(entry.wrongIds)||!entry.wrongIds.every((id:unknown)=>typeof id==='string'&&id.length>0))return [];
    return [[key,{correct:entry.correct,total:entry.total,date:entry.date,wrongIds:[...entry.wrongIds]}]];
  }));
}
function normalizeAnswers(value:unknown):Record<string,Record<string,number>> {
  return Object.fromEntries(Object.entries(object(value)).flatMap(([key,value])=>{
    if(!value||typeof value!=='object'||Array.isArray(value))return [];
    const answers=Object.fromEntries(Object.entries(object(value)).filter(([,answer])=>nonnegativeInteger(answer)&&answer<=9)) as Record<string,number>;
    return [[key,answers]];
  }));
}
export function getCurrentDay(start: string, now = new Date()) {
  if (!validDate(start)) return 1;
  const local = new Date(`${start}T00:00:00`);
  if (Number.isNaN(local.getTime())) return 1;
  const delta = (Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()) - Date.UTC(local.getFullYear(),local.getMonth(),local.getDate())) / 86400000;
  return Math.min(336,Math.max(1,Math.floor(delta)+1));
}
export function gradeAnswers(questions: {id:string;answer:number}[], answers:Record<string,number>) {
  const wrongIds=questions.filter(q=>answers[q.id]!==q.answer).map(q=>q.id);
  const correct=questions.length-wrongIds.length;
  return {correct,total:questions.length,percent:questions.length?Math.round(correct/questions.length*100):0,wrongIds};
}
export function updateReview(old:Review|undefined, remembered:boolean, today=dateKey()):Review {
  const interval=remembered?old?Math.min(60,Math.max(1,old.interval*2)):1:1;
  const date=new Date(`${today}T12:00:00`); date.setDate(date.getDate()+interval);
  return {interval,due:dateKey(date),reviews:(old?.reviews??0)+1};
}
export function getStreak(dates:string[],now=new Date()) {
  const set=new Set(dates); const current=new Date(now);
  if(!set.has(dateKey(current))) current.setDate(current.getDate()-1);
  let count=0;
  while(set.has(dateKey(current))){count++;current.setDate(current.getDate()-1);}
  return count;
}
export function normalizeState(value:unknown):LearningState {
  const o=object(value);
  return {startDate:validDate(o.startDate)?o.startDate:dateKey(),
    completed:[...new Set((Array.isArray(o.completed)?o.completed:[]).filter((x):x is number=>Number.isInteger(x)&&x>=1&&x<=336))],
    dates:[...new Set((Array.isArray(o.dates)?o.dates:[]).filter(validDate))],
    reviews:normalizeReviews(o.reviews), notes:Object.fromEntries(Object.entries(object(o.notes)).filter(([,v])=>typeof v==='string'&&v.length<=30000)) as Record<string,string>,
    attempts:normalizeAttempts(o.attempts),answers:normalizeAnswers(o.answers),checks:Object.fromEntries(Object.entries(object(o.checks)).filter(([,v])=>typeof v==='boolean')) as Record<string,boolean>,nickname:typeof o.nickname==='string'?o.nickname.slice(0,30):'学习者'};
}
export function validateImport(text:string):{ok:boolean;state?:LearningState} {
  if(text.length>2000000)return{ok:false};
  try{const data=JSON.parse(text);if(data.version!==1||!data.state||typeof data.state!=='object'||Array.isArray(data.state))return{ok:false};return{ok:true,state:normalizeState(data.state)};}catch{return{ok:false};}
}
