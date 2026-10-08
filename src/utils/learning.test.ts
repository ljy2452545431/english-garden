import { describe, it, expect } from 'vitest';
import { getCurrentDay, gradeAnswers, updateReview, getStreak, validateImport, normalizeState } from './learning';
describe('学习进度与判分', () => {
  it('按本地日历计算，限制 1 至 336 天并处理无效日期', () => {
    expect(getCurrentDay('2026-10-08',new Date(2026,9,8,23))).toBe(1);
    expect(getCurrentDay('2026-10-08',new Date(2026,9,9))).toBe(2);
    expect(getCurrentDay('2026-10-20',new Date(2026,9,8))).toBe(1);
    expect(getCurrentDay('2020-01-01',new Date(2026,9,8))).toBe(336);
    expect(getCurrentDay('invalid')).toBe(1);
  });
  it('判分不把漏答当正确、不接收无效答案', () => {
    const questions=[{id:'a',answer:1},{id:'b',answer:0}];
    expect(gradeAnswers(questions,{a:1})).toEqual({correct:1,total:2,percent:50,wrongIds:['b']});
    expect(gradeAnswers([],{}).percent).toBe(0);
    expect(gradeAnswers(questions,{a:5,b:1}).correct).toBe(0);
  });
  it('卡片复习无突变，忘记缩短间隔', () => {
    const old={interval:3,due:'2026-10-08',reviews:2};
    expect(updateReview(old,false,'2026-10-08').interval).toBe(1);
    expect(updateReview(old,true,'2026-10-08').interval).toBe(6);
    expect(old.interval).toBe(3);
    expect(updateReview(undefined,true,'2026-10-08').interval).toBe(1);
  });
  it('连续天数只统计相邻日期，今天未完成可从昨天计', () => {
    expect(getStreak(['2026-10-07','2026-10-08'],new Date(2026,9,8))).toBe(2);
    expect(getStreak(['2026-10-07'],new Date(2026,9,8))).toBe(1);
    expect(getStreak(['2026-10-05'],new Date(2026,9,8))).toBe(0);
  });
  it('导入限制体积并检查结构，不信任外部 JSON', () => {
    expect(validateImport('{bad').ok).toBe(false);
    expect(validateImport('x'.repeat(2000001)).ok).toBe(false);
    expect(validateImport(JSON.stringify({version:1,state:{}})).ok).toBe(true);
    expect(validateImport(JSON.stringify({version:5,state:{}})).ok).toBe(false);
    expect(validateImport(JSON.stringify({version:1,state:null})).ok).toBe(false);
  });
  it('修复错误进度值，完整保留合法数据', () => {
    expect(normalizeState({completed:[1,400,-1,2,2],notes:{a:'hi'},startDate:'2026-10-08'}).completed).toEqual([1,2]);
    expect(normalizeState(null).completed).toEqual([]);
  });
  it('损坏备份只保留合法的复习、测验和勾选记录，练习页可安全读取', () => {
    const review={interval:2,due:'2026-10-08',reviews:3};
    const attempt={correct:1,total:2,date:'2026-10-08',wrongIds:['q2']};
    const parsed=validateImport(JSON.stringify({version:1,state:{
      reviews:{good:review,nil:null,primitive:'bad',badInterval:{...review,interval:-1},badDate:{...review,due:'2026-02-30'},badCount:{...review,reviews:1.5}},
      attempts:{good:attempt,nil:null,noWrong:{correct:0,total:1,date:'2026-10-08'},badWrong:{...attempt,wrongIds:'q2'},badId:{...attempt,wrongIds:[null]},badScore:{...attempt,correct:3},badTotal:{...attempt,total:-1},badDate:{...attempt,date:'2026-02-30'}},
      checks:{yes:true,no:false,string:'false',number:1,nil:null},
    }}));
    expect(parsed.ok).toBe(true);
    expect(parsed.state?.reviews).toEqual({good:review});
    expect(parsed.state?.attempts).toEqual({good:attempt});
    expect(parsed.state?.checks).toEqual({yes:true,no:false});
    expect(()=>Object.values(parsed.state!.attempts).some(a=>a.wrongIds.includes('q2'))).not.toThrow();
  });
  it('日期必须实际存在，保留闰年并拒绝溢出的年月日', () => {
    const state=normalizeState({startDate:'2026-02-30',dates:['2024-02-29','2026-02-29','2026-04-31','2026-13-01','2026-10-08','2026-10-08']});
    expect(state.startDate).not.toBe('2026-02-30');
    expect(state.dates).toEqual(['2024-02-29','2026-10-08']);
    expect(getCurrentDay('2026-02-30',new Date(2026,2,5))).toBe(1);
    expect(getCurrentDay('2024-02-29',new Date(2024,2,1))).toBe(2);
  });
  it('归一化重新创建嵌套记录，避免修改备份输入', () => {
    const input={reviews:{hello:{interval:1,due:'2026-10-08',reviews:0}},attempts:{test:{correct:0,total:1,date:'2026-10-08',wrongIds:['q1']}}};
    const state=normalizeState(input);
    expect(state.reviews.hello).not.toBe(input.reviews.hello);
    expect(state.attempts.test).not.toBe(input.attempts.test);
    expect(state.attempts.test.wrongIds).not.toBe(input.attempts.test.wrongIds);
  });
  it('保存未交卷答案并按课程隔离，仅保留 0 至 9 的整数选项', () => {
    const input={answers:{'1.reading':{q1:0,q2:3,q3:9,negative:-1,large:10,fraction:1.5,text:'2',nil:null},'2.reading':{q1:1},broken:null,array:[1],empty:{}}};
    const parsed=validateImport(JSON.stringify({version:1,state:input}));
    expect(parsed.state?.answers).toEqual({'1.reading':{q1:0,q2:3,q3:9},'2.reading':{q1:1},empty:{}});
    expect(normalizeState({}).answers).toEqual({});
    expect(normalizeState(input).answers['1.reading']).not.toBe(input.answers['1.reading']);
    expect(gradeAnswers([{id:'q1',answer:0},{id:'q2',answer:3}],parsed.state!.answers['1.reading']).correct).toBe(2);
  });
});
