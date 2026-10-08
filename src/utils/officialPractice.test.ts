import { describe, expect, it } from 'vitest';
import { parseRawScore, remainingSeconds } from './officialPractice';

describe('官方模拟复盘', () => {
 it('只接受0到40的整数原始分，不把空白当零', () => {
  expect(parseRawScore('')).toBeNull();
  expect(parseRawScore('  ')).toBeNull();
  expect(parseRawScore('0')).toBe(0);
  expect(parseRawScore('40')).toBe(40);
  for(const value of ['41','-1','6.5','NaN','1e1','abc'])expect(parseRawScore(value)).toBeNull();
 });
 it('以截止时间计算，后台切换后不会慢计时，到时不为负数', () => {
  expect(remainingSeconds(61000,1000)).toBe(60);
  expect(remainingSeconds(61000,60500)).toBe(1);
  expect(remainingSeconds(61000,62000)).toBe(0);
 });
});
