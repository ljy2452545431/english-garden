import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import * as Icons from './index';
import { iconPaths } from './paths';

describe('本地 iconfont 开源图标', () => {
  it('全部兼容组件都能渲染有路径的 SVG，并默认隐藏装饰语义', () => {
    expect(Object.keys(Icons)).toHaveLength(43);
    for (const Icon of Object.values(Icons)) {
      const markup = renderToStaticMarkup(createElement(Icon, { size: 20, className: 'test-icon' }));
      expect(markup).toContain('width="20"');
      expect(markup).toContain('aria-hidden="true"');
      expect(markup).toMatch(/data-icon-source="iconfont:(9402|23534):/);
      expect(markup).toContain('<path');
      expect(markup).not.toMatch(/<script|<image|<foreignObject|https?:/);
    }
    expect(Object.keys(iconPaths)).toHaveLength(42);
  });

  it('画布工具具有选择、移动、文字、便签和形状的独立语义', () => {
    const expected = [[Icons.MousePointer, 'cursor-line'], [Icons.Move, 'drag-move-2-line'],
      [Icons.Text, 'text'], [Icons.StickyNote, 'sticky-note-line'], [Icons.Square, 'checkbox-blank-line'],
      [Icons.Circle, 'checkbox-blank-circle-line'], [Icons.Image, 'image-line']] as const;
    for (const [Icon, name] of expected) {
      expect(renderToStaticMarkup(createElement(Icon))).toContain(`data-icon-source="iconfont:23534:${name}"`);
    }
  });

  it('品牌、词汇、外观和今日图标使用准确的植物与工具语义', () => {
    const expected = [[Icons.Sprout, 'plant-line'], [Icons.Leaf, 'leaf-line'],
      [Icons.Palette, 'palette-line'], [Icons.Sun, 'sun-line']] as const;
    for (const [Icon, name] of expected) {
      const markup = renderToStaticMarkup(createElement(Icon));
      expect(markup).toContain(`data-icon-source="iconfont:23534:${name}"`);
      expect(markup).toContain('fill="currentColor"');
    }
  });

  it('接受可访问名称和主题颜色，方向旋转只作用于箭头内部', () => {
    const markup = renderToStaticMarkup(createElement(Icons.ArrowUpRight, { 'aria-label': '打开学习', style: { color: 'green' } }));
    expect(markup).toContain('role="img"');
    expect(markup).not.toContain('aria-hidden="true"');
    expect(markup).toContain('fill="currentColor"');
    expect(markup).toContain('rotate(-45 512 512)');
  });
});
