import { describe, expect, it } from "vitest";
import { clamp, localPoint, boundBox } from "./geometry";
describe("画布坐标", () => {
  it("将屏幕位置换算为文档坐标", () =>
    expect(
      localPoint(
        120,
        90,
        { left: 20, top: 40, width: 200, height: 100 },
        1000,
        500,
      ),
    ).toEqual([500, 250]));
  it("限制元素边界且不修改输入", () => {
    const box = { x: -20, y: 900, width: 200, height: 100 };
    expect(boundBox(box, 800, 600)).toEqual({
      x: 0,
      y: 500,
      width: 200,
      height: 100,
    });
    expect(box.x).toBe(-20);
  });
  it("限制缩放上下限", () => expect(clamp(4, 0.25, 2)).toBe(2));
});
