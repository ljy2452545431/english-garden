import { describe, expect, it } from "vitest";
import { moveCard, normalizedPoint, nearestCard } from "./canvas";

describe("可拖动的外观画布", () => {
  it("拖到最后或最前按插入重排，保留原数组", () => {
    const order = ["tasks", "timer", "growth", "note"];
    expect(moveCard(order, "tasks", "note")).toEqual([
      "timer",
      "growth",
      "note",
      "tasks",
    ]);
    expect(moveCard(order, "note", "tasks")).toEqual([
      "note",
      "tasks",
      "timer",
      "growth",
    ]);
    expect(order).toEqual(["tasks", "timer", "growth", "note"]);
  });
  it("不存在或相同卡片不改变顺序", () => {
    expect(moveCard(["tasks", "timer"], "bad", "tasks")).toEqual([
      "tasks",
      "timer",
    ]);
    expect(moveCard(["tasks", "timer"], "tasks", "tasks")).toEqual([
      "tasks",
      "timer",
    ]);
  });
  it("归一坐标保留抓取偏移，并限制在画布内", () => {
    const rect = { left: 10, top: 20, width: 100, height: 200 };
    expect(normalizedPoint(70, 120, rect, { x: 10, y: 0 })).toEqual({
      x: 0.5,
      y: 0.5,
    });
    expect(normalizedPoint(-100, 1000, rect)).toEqual({ x: 0, y: 1 });
    expect(normalizedPoint(10, 20, { ...rect, width: 0, height: 0 })).toEqual({
      x: 0,
      y: 0,
    });
  });
  it("选择离指针最近的卡片中心", () => {
    expect(
      nearestCard(90, 100, [
        { id: "tasks", x: 20, y: 50 },
        { id: "timer", x: 100, y: 100 },
      ]),
    ).toBe("timer");
    expect(nearestCard(0, 0, [])).toBeUndefined();
  });
});
