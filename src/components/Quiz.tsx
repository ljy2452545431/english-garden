import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import type { Question } from '../data/types';
import { gradeAnswers } from '../utils/learning';
import { zh as t } from '../i18n/zh';
export function Quiz({questions,onResult,title,savedAnswers,onAnswers}:{questions:Question[];onResult?:(result:ReturnType<typeof gradeAnswers>)=>void;title?:string;savedAnswers?:Record<string,number>;onAnswers?:(answers:Record<string,number>)=>void}){
  const [localAnswers,setAnswers]=useState<Record<string,number>>({}),[submitted,setSubmitted]=useState(false);
  const stored=savedAnswers??localAnswers;
  // 只恢复本题集可选的答案，旧题及超出选项范围的导入值不计入进度。
  const answers=Object.fromEntries(questions.flatMap(q=>Number.isInteger(stored[q.id])&&stored[q.id]>=0&&stored[q.id]<q.options.length?[[q.id,stored[q.id]]]:[]));
  function change(next:Record<string,number>){setAnswers(next);onAnswers?.(next);}
  const result=gradeAnswers(questions,answers);
  return <section className="quiz stack" aria-label={title??t.practice}>
    {title&&<h3>{title}</h3>}
    {questions.map((q,i)=><fieldset key={q.id} className={submitted?(answers[q.id]===q.answer?'question correct':'question incorrect'):'question'}>
      <legend>{i+1}. {q.prompt}</legend>
      <div className="answers">{q.options.map((option,j)=><label key={j} className={answers[q.id]===j?'answer selected':'answer'}><input type="radio" name={q.id} checked={answers[q.id]===j} disabled={submitted} onChange={()=>change({...answers,[q.id]:j})}/><span className="letter">{String.fromCharCode(65+j)}</span><span>{option}</span></label>)}</div>
      {submitted&&<p className="explanation"><strong>{t.explain} · {String.fromCharCode(65+q.answer)}</strong><br/>{q.explanation}</p>}
    </fieldset>)}
    {submitted?<><div className="score-result"><span>{result.correct}<small> / {result.total}</small></span><div><strong>{t.score} {result.percent}%</strong><p>把错误弄懂，比一次全对更有价值。</p></div></div><button className="button secondary" onClick={()=>{setSubmitted(false);change({});}}><RotateCcw size={17}/>{t.retry}</button></>:<button className="button primary" onClick={()=>{setSubmitted(true);onResult?.(result);}}><Check size={17}/>{t.submit}（{Object.keys(answers).length}/{questions.length}）</button>}
  </section>;
}
