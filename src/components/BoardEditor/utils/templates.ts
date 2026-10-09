import {
  makeNode,
  type BoardDocument,
  type BoardNode,
  type BoardKind,
} from "../../../utils/board";
import { boardCreativeText as t } from "../../../i18n/board-creative";
export const templateIds = ["collage", "poster", "together", "blank"] as const;
export type TemplateId = (typeof templateIds)[number];
const node = (
  kind: BoardKind,
  x: number,
  y: number,
  width: number,
  height: number,
  patch: Partial<BoardNode> = {},
) => makeNode(kind, { x, y, width, height, ...patch });
/** 每次新建节点，不共享 UUID、笔迹数组或任何可编辑对象。 */
export function createTemplate(id: TemplateId): BoardDocument {
  const base: BoardDocument = {
    schema: 1,
    width: 900,
    height: 1200,
    background: "#FAF8F4",
    nodes: [],
  };
  if (id === "blank") return base;
  if (id === "collage") {
    const copy = t.templateCopy.collage;
    return {
      ...base,
      nodes: [
        node("text", 75, 75, 700, 100, {
          text: copy.title,
          fontSize: 64,
          color: "#3D493E",
        }),
        node("text", 78, 185, 700, 85, {
          text: copy.subtitle,
          fontSize: 40,
          color: "#63705F",
        }),
        node("rect", 100, 340, 650, 470, { fill: "#DCE4DB", rotation: -4 }),
        node("rect", 135, 375, 580, 370, { fill: "#F4F2EB", rotation: -4 }),
        node("text", 240, 485, 480, 100, {
          text: copy.photo,
          fontSize: 48,
          color: "#6C7666",
          rotation: -4,
        }),
        node("note", 410, 820, 350, 230, {
          text: copy.note,
          fontSize: 48,
          fill: "#E9DED0",
          rotation: 5,
        }),
        node("ellipse", 105, 900, 150, 150, { fill: "#B8C7B6" }),
        node("text", 78, 1080, 745, 65, {
          text: copy.footer,
          fontSize: 32,
          color: "#63705F",
        }),
      ],
    };
  }
  if (id === "poster") {
    const copy = t.templateCopy.poster;
    return {
      ...base,
      background: "#EEF3F5",
      nodes: [
        node("rect", 65, 70, 770, 1060, { fill: "#F9FBFA" }),
        node("ellipse", 555, 170, 180, 180, { fill: "#D6E4E9" }),
        node("rect", 110, 180, 250, 12, { fill: "#4D7180" }),
        node("text", 110, 285, 680, 110, {
          text: copy.subtitle,
          fontSize: 40,
          color: "#577480",
        }),
        node("text", 110, 460, 690, 280, {
          text: copy.title,
          fontSize: 64,
          color: "#294D5B",
        }),
        node("rect", 110, 845, 90, 12, { fill: "#AAC2CB" }),
        node("text", 110, 935, 690, 115, {
          text: copy.footer,
          fontSize: 34,
          color: "#577480",
        }),
      ],
    };
  }
  const copy = t.templateCopy.together;
  return {
    ...base,
    background: "#F8F1F2",
    nodes: [
      node("text", 65, 75, 785, 100, {
        text: copy.title,
        fontSize: 52,
        color: "#5A4148",
      }),
      node("text", 70, 195, 755, 80, {
        text: copy.subtitle,
        fontSize: 38,
        color: "#80686D",
      }),
      node("note", 75, 345, 720, 240, {
        text: copy.first,
        fontSize: 48,
        fill: "#F2DFDD",
        rotation: -2,
      }),
      node("note", 105, 665, 720, 240, {
        text: copy.second,
        fontSize: 48,
        fill: "#E9E4D9",
        rotation: 2,
      }),
      node("ellipse", 705, 280, 80, 80, { fill: "#C79E9C" }),
      node("rect", 80, 1035, 200, 8, { fill: "#D7B8B6" }),
      node("text", 80, 1080, 740, 65, {
        text: copy.footer,
        fontSize: 36,
        color: "#80686D",
      }),
    ],
  };
}
