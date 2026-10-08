import { describe, it, expect } from "vitest";
import { emptyBoard, makeNode, validBoard, boardAssetIds } from "./board";
describe("自由画布数据", () => {
  it("文本、便签与合法图片可保存", () => {
    const id = crypto.randomUUID();
    const doc = {
      ...emptyBoard(),
      nodes: [
        makeNode("text", { text: "你好" }),
        makeNode("image", { assetId: id }),
        makeNode("image", { assetId: id }),
      ],
    };
    expect(validBoard(doc)).toBe(true);
    expect(boardAssetIds(doc)).toEqual([id]);
  });
  it("拒绝重复编号、非法颜色、URL及无限坐标", () => {
    const node = makeNode("rect");
    for (const patch of [
      { x: Infinity },
      { fill: "url(x)" },
      { id: "bad" },
      { color: "#fff" },
      { rotation: 190 },
      { fontSize: 2 },
      { assetId: "https://example.com" },
      { text: "a".repeat(4001) },
    ])
      expect(
        validBoard({ ...emptyBoard(), nodes: [{ ...node, ...patch }] }),
      ).toBe(false);
    expect(validBoard({ ...emptyBoard(), nodes: [node, node] })).toBe(false);
  });
  it("限制绘图点和文档大小范围", () => {
    expect(validBoard(null)).toBe(false);
    expect(validBoard({ ...emptyBoard(), width: 10 })).toBe(false);
    expect(
      validBoard({
        ...emptyBoard(),
        nodes: [
          makeNode("stroke", {
            points: [
              [0, 0],
              [20, 20],
            ],
          }),
        ],
      }),
    ).toBe(true);
    expect(
      validBoard({
        ...emptyBoard(),
        nodes: [makeNode("stroke", { points: [[0, 0]] })],
      }),
    ).toBe(false);
    expect(
      validBoard({
        ...emptyBoard(),
        nodes: [
          makeNode("stroke", {
            points: [
              [0, 0],
              [5000, 0],
            ],
          }),
        ],
      }),
    ).toBe(false);
  });
});
