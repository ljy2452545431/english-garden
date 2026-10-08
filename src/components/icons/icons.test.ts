import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as Icons from './index';
import { iconPaths } from './paths';

describe('本地 iconfont 官方图标', () => {
  it('全部兼容组件都能渲染有路径的 SVG，并默认隐藏装饰语义', () => {
    expect(Object.keys(Icons)).toHaveLength(37);
    for (const Icon of Object.values(Icons)) {
      const markup = renderToStaticMarkup(createElement(Icon, { size: 20, className: 'test-icon' }));
      expect(markup).toContain('width="20"');
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).toContain('data-icon-source="iconfont:9402:');
      expect(markup).toContain('<path');
      expect(markup).not.toMatch(/<script|<image|<foreignObject|https?:/);
    }
    expect(Object.keys(iconPaths)).toHaveLength(36);
  });

  it('接受可访问名称和主题颜色，方向旋转只作用于箭头内部', () => {
    const markup = renderToStaticMarkup(createElement(Icons.ArrowUpRight, { 'aria-label': '打开学习', style: { color: 'green' } }));
    expect(markup).toContain('role="img"');
    expect(markup).not.toContain('aria-hidden="true"');
    expect(markup).toContain('fill="currentColor"');
    expect(markup).toContain('rotate(-45 512 512)');
  });
});
