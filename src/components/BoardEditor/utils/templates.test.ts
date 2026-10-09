import { describe, expect, it } from "vitest";
import { validBoard } from "../../../utils/board";
import { createTemplate, templateIds } from "./templates";
describe("手机创作模板", () => {
  it("全部模板符合现有画布契约且不依赖外部图片", () => {
    for (const id of templateIds) {
      const doc = createTemplate(id);
      expect(validBoard(doc)).toBe(true);
      expect([doc.width, doc.height]).toEqual([900, 1200]);
      expect(doc.nodes.every((node) => node.assetId === null)).toBe(true);
      if (id !== "blank") expect(doc.nodes.length).toBeGreaterThanOrEqual(6);
    }
  });
  it("每次生成独立 UUID 和对象，不会修改其他作品", () => {
    const a = createTemplate("collage"),
      b = createTemplate("collage");
    expect(a.nodes.map((n) => n.id)).not.toEqual(b.nodes.map((n) => n.id));
    a.nodes[0].fill = "#000000";
    a.nodes[0].points.push([0, 0]);
    expect(b.nodes[0].fill).not.toBe("#000000");
    expect(b.nodes[0].points).toEqual([]);
  });
});
