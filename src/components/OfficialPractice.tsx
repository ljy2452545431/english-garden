import { useState } from 'react';
import { officialMaterials, type OfficialMaterial } from '../data/officialMaterials';
import type { Garden } from '../hooks/useGarden';
import { officialZh as t } from '../i18n/officialZh';
import { dateKey } from '../utils/learning';
import { parseRawScore } from '../utils/officialPractice';
import { ArrowUpRight, BookOpen, Download } from './icons';
import { ExamTimer } from './ExamTimer';
import { Recorder } from './Recorder';
import { OfficialPlayer } from './OfficialPlayer';

export function OfficialPractice({ garden }: { garden: Garden }) {
  const [selected, setSelected] = useState(officialMaterials[0].id);
  const material = officialMaterials.find(item => item.id === selected) ?? officialMaterials[0];
  return <section className="paper official-practice">
    <div className="official-heading">
      <div><span className="eyebrow">IELTS · OFFICIAL</span><h2>{t.title}</h2></div>
      <BookOpen size={26} />
    </div>
    <label className="field-label" htmlFor="official-material">{t.select}</label>
    <select id="official-material" value={selected} onChange={event => setSelected(event.target.value)}>
      {officialMaterials.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
    </select>
    <OfficialWorkspace key={material.id} material={material} garden={garden} />
  </section>;
}

function OfficialWorkspace({ material, garden }: { material: OfficialMaterial; garden: Garden }) {
  const [showPdf, setShowPdf] = useState(false);
  const [rawScore, setRawScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const prefix = `official.${material.id}`;
  const completeObjective = material.scope === 'full' && (material.skill === 'reading' || material.skill === 'listening');
  const attempt = garden.state.attempts[prefix];
  function saveNote(key: string, value: string) {
    garden.update(previous => ({ ...previous, notes: { ...previous.notes, [key]: value.slice(0, 12000) } }));
  }
  function saveScore() {
    if (garden.recovery) return;
    const score = parseRawScore(rawScore);
    if (score === null) { setFeedback(t.scoreInvalid); return; }
    garden.update(previous => ({ ...previous, attempts: { ...previous.attempts, [prefix]: { correct: score, total: 40, date: dateKey(), wrongIds: [] } } }));
    setFeedback(`${t.savedScore}：${score} / 40`);
  }
  function draft(key: string, label: string, hint?: string) {
    const id = `${prefix}.${key}`;
    return <div className="official-draft" key={id}>
      <label className="field-label" htmlFor={id}>{label}</label>
      {hint && <p className="muted">{hint}</p>}
      <textarea id={id} className="draft english" maxLength={12000} value={garden.state.notes[id] ?? ''} onChange={event => saveNote(id, event.target.value)} />
    </div>;
  }
  return <div className="official-workspace stack gap-5">
    <div className="official-material-info">
      <div className="row flex-wrap"><span className="tag">{t.skill[material.skill]}</span><span className="tag">{t.scope[material.scope]}</span><span className="tag">{material.format}</span></div>
      <h3>{material.title}</h3>
      <p>{material.description}</p>
      <p className="muted">{t.source}：{material.provider} · {t.verified}：{material.verifiedAt}</p>
      <p className="notice">{t.boundary}</p>
      <div className="row flex-wrap official-links">
        <a className="button primary" href={material.url} target="_blank" rel="noopener noreferrer"><ArrowUpRight size={17} />{t.open}</a>
        {material.answerUrl && <a className="button secondary" href={material.answerUrl} target="_blank" rel="noopener noreferrer"><Download size={17} />{material.skill === 'writing' ? t.writingExamples : t.answers}</a>}
        <a className="button secondary" href={material.sourceUrl} target="_blank" rel="noopener noreferrer">{t.sourcePage}<ArrowUpRight size={15} /></a>
      </div>
    </div>
    {material.documentUrl && <div className="official-document">
      <button className="button secondary" aria-expanded={showPdf} onClick={() => setShowPdf(value => !value)}><BookOpen size={17} />{showPdf ? t.pdfClose : t.pdfLoad}</button>
      <p className="muted">{t.pdfFallback}</p>
      {showPdf && <iframe title={`${t.pdfTitle} · ${material.title}`} src={material.documentUrl} className="official-pdf" loading="lazy" referrerPolicy="no-referrer" />}
    </div>}
    {material.embedUrl && <OfficialPlayer url={material.embedUrl} title={material.title} />}
    <ExamTimer minutes={material.minutes} />
    {completeObjective && <>
      <div className="official-answer-sheet">
        <h3>{t.answerDraft}</h3><p className="muted">{t.answerNote}</p>
        <div className="official-answer-grid">
          {Array.from({ length: 40 }, (_, index) => {
            const number = index + 1;
            const id = `${prefix}.answer.${number}`;
            return <label key={id} htmlFor={id}><span>{number}</span><input id={id} aria-label={`${t.question} ${number} ${t.questionSuffix}`} value={garden.state.notes[id] ?? ''} maxLength={120} autoComplete="off" onChange={event => saveNote(id, event.target.value)} /></label>;
          })}
        </div>
      </div>
      <div className="official-score">
        <label className="field-label" htmlFor={`${prefix}.score`}>{t.rawScore}</label>
        <div className="row flex-wrap"><input id={`${prefix}.score`} type="text" inputMode="numeric" maxLength={3} value={rawScore} onChange={event => { setRawScore(event.target.value); setFeedback(''); }} aria-describedby={`${prefix}.score-hint`} aria-invalid={feedback === t.scoreInvalid || undefined} /><button className="button primary" disabled={Boolean(garden.recovery)} onClick={saveScore}>{t.saveScore}</button></div>
        <p className="muted" id={`${prefix}.score-hint`}>{t.scoreHint}</p>
        {attempt && <p>{t.scoreLabel}：{attempt.correct} / 40 · {attempt.date}</p>}
        {feedback && <p className="notice" role="status">{feedback}</p>}
      </div>
    </>}
    {material.skill === 'writing' && <><p className="muted">{t.writingHint}</p>{draft('task1', t.task1)}{draft('task2', t.task2)}</>}
    {material.skill === 'speaking' && <>
      {!!material.audioSamples?.length && <section className="official-audio-samples"><h3>{t.sampleAudio}</h3>{material.audioSamples.map(sample => <OfficialAudio key={sample.url} sample={sample} />)}</section>}
      <p className="muted">{t.speakingHint}</p><Recorder token={garden.auth?.token} title={`official-${material.id}-speaking`} />{draft('peer', t.peer)}
    </>}
    {draft('review', t.review, t.reviewHint)}
    <p className="muted" role="status">{garden.status}</p>
  </div>;
}

function OfficialAudio({ sample }: { sample: { title: string; url: string; documentUrl: string } }) {
  const [error, setError] = useState(false);
  return <div className="official-audio">
    <h4>{sample.title}</h4>
    <audio controls preload="none" src={sample.url} aria-label={sample.title} onError={() => setError(true)} onCanPlay={() => setError(false)} />
    <div className="row flex-wrap">
      <a className="button secondary" href={sample.url} target="_blank" rel="noopener noreferrer">{t.openAudio}<ArrowUpRight size={15} /></a>
      <a className="button secondary" href={sample.documentUrl} target="_blank" rel="noopener noreferrer">{t.transcript}<ArrowUpRight size={15} /></a>
    </div>
    {error && <p className="notice" role="status">{t.audioError}</p>}
  </div>;
}
