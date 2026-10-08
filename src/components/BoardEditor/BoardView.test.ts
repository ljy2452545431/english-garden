import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BoardView } from './BoardView';
import { emptyBoard, makeNode } from '../../utils/board';
it('文字使用转义节点，分行渲染不会执行HTML', () => {
  const document = { ...emptyBoard(), nodes: [makeNode('text', { text: '<script>alert(1)</script>\n第二行' })] };
  const markup = renderToStaticMarkup(createElement(BoardView, { document, assetUrls: {} }));
  expect(markup).toContain('&lt;script&gt;'); expect(markup).not.toContain('<script>'); expect(markup.match(/<tspan/g)).toHaveLength(2);
});
it('缺少私密图片使用占位，非HTTPS链接不会嵌入', () => {
  const assetId = crypto.randomUUID(), document = { ...emptyBoard(), nodes: [makeNode('image', { assetId })] };
  const markup = renderToStaticMarkup(createElement(BoardView, { document, assetUrls: { [assetId]: 'javascript:alert(1)' } }));
  expect(markup).toContain('图片暂未加载'); expect(markup).not.toContain('javascript:');
});
it('手绘使用归一化坐标，使调整大小保持图案比例', () => {
  const document = { ...emptyBoard(), nodes: [makeNode('stroke', { width: 400, height: 200, points: [[0, 0], [1, 1]] })] };
  expect(renderToStaticMarkup(createElement(BoardView, { document, assetUrls: {} }))).toContain('points="0,0 400,200"');
});
