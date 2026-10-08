import { describe, expect, it } from 'vitest';
import curriculum from './curriculum.json';
import plan from './plan.json';
import metadata from './content-metadata.json';
import resources from './resources.json';
import type { WeeklyLesson } from './types';

const lessons: WeeklyLesson[] = curriculum;

describe('学习内容契约与可复盘边界', () => {
  it('保留连续 336 天，每周 7 天且关联现有原创课程', () => {
    expect(plan).toHaveLength(336);
    expect(lessons).toHaveLength(48);
    const weeks = new Set(lessons.map((lesson) => lesson.week));
    plan.forEach((day, index) => {
      expect(day.day).toBe(index + 1);
      expect(day.week).toBe(Math.floor(index / 7) + 1);
      expect(weeks.has(day.week)).toBe(true);
      expect(day.main.trim().length).toBeGreaterThan(0);
      expect(day.speaking.trim().length).toBeGreaterThan(0);
      expect(day.output.trim().length).toBeGreaterThan(0);
    });
  });

  it('每周具备词汇、语法、听读、写说；所有题可正确判分', () => {
    const questionIds = new Set<string>();
    const answerIndexes = new Set<number>();
    for (const lesson of lessons) {
      expect(lesson.vocabulary.length).toBeGreaterThanOrEqual(8);
      expect(lesson.vocabulary.length).toBeLessThanOrEqual(12);
      lesson.vocabulary.forEach((card) => {
        expect(card.word.trim()).not.toBe('');
        expect(card.meaning.trim()).not.toBe('');
        expect(card.partOfSpeech.trim()).not.toBe('');
        expect(card.example.split(/\s+/).length).toBeGreaterThanOrEqual(3);
      });
      expect(lesson.grammar.questions).toHaveLength(3);
      expect(lesson.reading.questions.length).toBeGreaterThanOrEqual(3);
      expect(lesson.listening.questions.length).toBeGreaterThanOrEqual(3);
      expect(lesson.speaking.part1).toHaveLength(3);
      expect(lesson.speaking.part3).toHaveLength(2);
      expect(lesson.speaking.part2.trim()).not.toBe('');
      expect(lesson.writing.task1.trim()).not.toBe('');
      expect(lesson.writing.task2.trim()).not.toBe('');
      for (const section of [lesson.grammar, lesson.reading, lesson.listening]) {
        for (const item of section.questions) {
          expect(questionIds.has(item.id)).toBe(false);
          questionIds.add(item.id);
          expect(item.options.length).toBeGreaterThanOrEqual(3);
          expect(new Set(item.options).size).toBe(item.options.length);
          expect(Number.isInteger(item.answer)).toBe(true);
          expect(item.answer).toBeGreaterThanOrEqual(0);
          expect(item.answer).toBeLessThan(item.options.length);
          expect(item.explanation.trim()).not.toBe('');
          answerIndexes.add(item.answer);
        }
      }
    }
    expect(questionIds.size).toBe(480);
    expect(answerIndexes.size).toBe(3);
  });

  it('证据定位题的正确选项确实出现在原文，不能用随机答案凑内容', () => {
    for (const lesson of lessons) {
      for (const section of [lesson.reading, lesson.listening]) {
        for (const item of section.questions.slice(0, 3)) {
          expect(section.text.includes(item.options[item.answer])).toBe(true);
        }
      }
    }
  });

  it('48 份短文及对话都不同，起步明确、后期不声称完整真题', () => {
    expect(new Set(lessons.map((lesson) => lesson.reading.text)).size).toBe(48);
    expect(new Set(lessons.map((lesson) => lesson.listening.text)).size).toBe(48);
    expect(lessons[0].level).toBe('A1');
    expect(lessons[0].reading.text).toContain('My name is Lin');
    expect(lessons[0].speaking.part1[0]).toBe('What is your name?');
    expect(metadata.audioNotice).toContain('不等同真实考试音频');
    expect(metadata.scoreNotice).toContain('不换算 IELTS 分数');
    expect(metadata.examMaterialBoundary).toContain('没有复制付费');
    expect(metadata.contentOrigin).toContain('不是 336 套');
  });

  it('TFNG 包含三种答案，并保留官方资源来源和版权说明', () => {
    const judgmentAnswers = new Set(lessons.map((lesson) => {
      const item = lesson.reading.questions[3];
      return item.options[item.answer];
    }));
    expect(judgmentAnswers).toEqual(new Set(['True', 'False', 'Not Given']));
    expect(resources.length).toBeGreaterThanOrEqual(5);
    for (const resource of resources) {
      expect(new URL(resource.url).protocol).toBe('https:');
      expect(resource.licenseNote.trim()).not.toBe('');
    }
  });
});
