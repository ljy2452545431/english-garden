import { describe, expect, it } from "vitest";
import {
  fitView,
  zoomView,
  normalRotation,
  strokeNode,
  sameGeometry,
  mergeGeometry,
} from "./stage-geometry";
import { makeNode } from "../../../utils/board";
describe("画布视口与手绘几何", () => {
  it("文本flush发生在拖动开始后时只提交位移，不覆盖新文字或角度", () => {
    const before = makeNode("note", { text: "旧文字", rotation: 0 });
    const current = { ...before, text: "新输入的文字", rotation: 20 };
    const merged = mergeGeometry(current, before, {
      ...before,
      x: before.x + 30,
    });
    expect(merged.text).toBe("新输入的文字");
    expect(merged.rotation).toBe(20);
    expect(merged.x).toBe(before.x + 30);
  });
  it("点选与浮点误差不生成保存，真实移动需要提交", () => {
    const node = makeNode("rect");
    expect(sameGeometry(node, { ...node, x: node.x + 0.00001 })).toBe(true);
    expect(sameGeometry(node, { ...node, x: node.x + 2 })).toBe(false);
  });
  it("适配保留边距居中", () =>
    expect(fitView(390, 400, 1600, 1000)).toEqual({
      x: 16,
      y: 88.125,
      scale: 0.22375,
    }));
  it("围绕手指缩放时文档位置不漂移", () => {
    const before = { x: 20, y: 40, scale: 0.5 },
      next = zoomView(before, { x: 100, y: 90 }, 2);
    expect((100 - next.x) / next.scale).toBe((100 - before.x) / before.scale);
  });
  it("旋转符合数据库角度边界", () => expect(normalRotation(270)).toBe(-90));
  it("笔迹归一化并限制最大点数", () => {
    const points = Array.from({ length: 2100 }, (_, i) => ({
      x: i / 3,
      y: i % 2 ? 100 : 50,
    }));
    const node = strokeNode(points, "#283443", 16);
    expect(node.points.length).toBeLessThanOrEqual(2000);
    expect(node.kind).toBe("stroke");
    expect(
      node.points.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1),
    ).toBe(true);
  });
});
