import { describe, expect, it } from 'vitest';
import { officialMaterials } from './officialMaterials';

describe('官方资料目录', () => {
 it('只有核实的完整听读写单科卷标为完整，听读整卷40题', () => {
  const full=officialMaterials.filter(m=>m.scope==='full');
  expect(full.map(m=>m.skill)).toEqual(['listening','reading','writing']);
  for(const m of full.filter(m=>m.skill!=='writing'))expect(m.questionCount).toBe(40);
  const sample=officialMaterials.find(m=>m.id==='official-reading-tfng');
  expect(sample?.scope).toBe('tasks');
  expect(sample?.questionCount).toBe(3);
 });
 it('来源与文件URL只使用官方域名，且口语有三段音频来源', () => {
  const trusted=new Set(['ielts.org','ielts.idp.com','takeielts.britishcouncil.org','demo-ielts.inspera.com','ielts.inspera.com','assets.ctfassets.net']);
  for(const material of officialMaterials) {
   const urls=[material.url,material.sourceUrl,material.answerUrl,material.documentUrl,material.embedUrl,...(material.audioSamples??[]).flatMap(a=>[a.url,a.documentUrl])].filter((u):u is string=>Boolean(u));
   for(const url of urls){ const parsed=new URL(url);expect(parsed.protocol).toBe('https:');expect(trusted.has(parsed.hostname)).toBe(true); }
  }
  expect(officialMaterials.find(m=>m.skill==='speaking')?.audioSamples).toHaveLength(3);
  expect(new Set(officialMaterials.map(m=>m.id)).size).toBe(officialMaterials.length);
 });
});
