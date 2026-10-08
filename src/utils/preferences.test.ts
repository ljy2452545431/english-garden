import { describe, expect, it, vi } from "vitest";
import {
  defaults,
  normalizePreferences,
  readPreferences,
  saveLook,
} from "./preferences";

describe("外观偏好", () => {
  it("升级旧设置并保留原有配色和顺序", () => {
    const result = normalizePreferences({
      theme: "rose",
      order: ["note", "growth", "timer", "tasks"],
    });
    expect(result.theme).toBe("rose");
    expect(result.card).toBe("soft");
    expect(result.order[0]).toBe("note");
  });
  it("过滤无效设置，不能隐藏每日任务", () => {
    const result = normalizePreferences({
      theme: "bad",
      card: "bad",
      hidden: ["tasks", "note", "unknown"],
      order: ["tasks", "tasks"],
    });
    expect(result.theme).toBe(defaults.theme);
    expect(result.card).toBe("soft");
    expect(result.hidden).toEqual(["note"]);
    expect(result.order).toEqual(defaults.order);
  });
  it("保存独立快照，最多六套，过滤损坏的收藏", () => {
    const result = saveLook({ ...defaults, theme: "night" }, "我的夜读");
    expect(result.looks[0].appearance.theme).toBe("night");
    expect(defaults.looks).toEqual([]);
    expect(
      normalizePreferences({ looks: [{ name: "<script>", appearance: null }] })
        .looks,
    ).toEqual([]);
    let next = defaults;
    for (let i = 0; i < 8; i++) next = saveLook(next, `搭配${i}`);
    expect(next.looks).toHaveLength(6);
    expect(normalizePreferences(next).looks[0].name).toBe("搭配7");
    expect(saveLook(defaults, "  ")).toBe(defaults);
  });
  it("本机读取成功，遇到损坏数据或存储不可用回退默认", () => {
    const getItem = vi.fn().mockReturnValue(JSON.stringify({ theme: "ocean" }));
    vi.stubGlobal("localStorage", { getItem });
    try {
      expect(readPreferences().theme).toBe("ocean");
      getItem.mockReturnValue(null);
      expect(readPreferences().theme).toBe("garden");
      getItem.mockReturnValue("invalid json");
      expect(readPreferences().order).toEqual(defaults.order);
      getItem.mockImplementation(() => {
        throw new Error("storage unavailable");
      });
      expect(readPreferences().looks).toEqual([]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
