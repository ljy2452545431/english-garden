import { describe, expect, it } from 'vitest';
import { nextTabIndex } from './tabs';

describe('课堂键盘导航', () => {
  it('左右循环切换，Home / End 跳到首尾', () => {
    expect(nextTabIndex('ArrowRight', 5, 6)).toBe(0);
    expect(nextTabIndex('ArrowLeft', 0, 6)).toBe(5);
    expect(nextTabIndex('Home', 3, 6)).toBe(0);
    expect(nextTabIndex('End', 3, 6)).toBe(5);
    expect(nextTabIndex('ArrowRight', 1, 6)).toBe(2);
  });
  it('不拦截其他按键或空列表', () => {
    expect(nextTabIndex('Tab', 1, 6)).toBeNull();
    expect(nextTabIndex('ArrowRight', 0, 0)).toBeNull();
  });
});
