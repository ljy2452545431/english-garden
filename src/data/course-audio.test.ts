import { describe, expect, it } from 'vitest';
import curriculum from './curriculum.json';
import audio from './course-audio.json';
const manifest: Record<string, string> = audio;
const files = import.meta.glob('../../public/audio/*.mp3');
describe('课程音频与内容一致性', () => {
  it('48周每个可朗读的词汇和听力正文均有本地MP3', () => {
    const texts = new Set(curriculum.flatMap(lesson => [...lesson.vocabulary.map(word => word.word), lesson.listening.text]));
    expect(Object.keys(manifest)).toHaveLength(texts.size);
    for (const text of texts) {
      const path = manifest[text];
      expect(path).toMatch(/^audio\/[a-f0-9]{16}\.mp3$/);
      expect(files['../../public/' + path]).toBeDefined();
    }
  });
});
