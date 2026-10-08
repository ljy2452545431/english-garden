import { useRef, useState } from 'react';
import { officialZh as t } from '../i18n/officialZh';
import { BookOpen } from './icons';

/** 官方页面以独立来源加载；不代理、不修改其试卷，也不读取其答题内容。 */
export function OfficialPlayer({ url, title }: { url: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const container = useRef<HTMLDivElement>(null);
  async function fullscreen() {
    try {
      if (!container.current?.requestFullscreen) throw new Error('unsupported');
      await container.current.requestFullscreen();
      setError('');
    } catch {
      setError(t.fullscreenUnavailable);
    }
  }
  return <section className="official-player-section">
    {!loaded ? <button className="button primary" onClick={() => setLoaded(true)}><BookOpen size={20}/>{t.playerLoad}</button> : <div className="official-player" ref={container}>
      <div className="official-player-toolbar"><strong>{t.playerTitle}</strong><button className="button secondary" onClick={fullscreen}>{t.fullscreen}</button></div>
      <div className="official-player-scroll"><iframe src={url} title={`${t.playerTitle} · ${title}`} allow="autoplay; fullscreen" allowFullScreen referrerPolicy="no-referrer" /></div>
    </div>}
    <p className="muted">{t.playerNote}</p>
    {loaded && <p className="muted">{t.playerFallback}</p>}
    {error && <p className="notice" role="status">{error}</p>}
  </section>;
}
