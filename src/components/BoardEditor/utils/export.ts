import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import type { BoardDocument } from "../../../utils/board";
import { exportBoardPng } from "../../../utils/board-images";
/** 只在导出时临时创建 SVG，编辑期间没有第二套隐藏场景。 */
export async function exportDocument(
  document: BoardDocument,
  assetUrls: Record<string, string>,
  title: string,
  isActive: () => boolean = () => true,
) {
  const { BoardView } = await import("../BoardView");
  if (!isActive()) return;
  const container = globalThis.document.createElement("div");
  const root = createRoot(container);
  try {
    flushSync(() =>
      root.render(createElement(BoardView, { document, assetUrls })),
    );
    const svg = container.querySelector("svg");
    if (!svg) throw new Error("导出失败，请重试");
    await exportBoardPng(svg, title, isActive);
  } finally {
    root.unmount();
  }
}
