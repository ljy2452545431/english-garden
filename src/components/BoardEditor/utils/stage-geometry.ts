import { makeNode, type BoardNode } from "../../../utils/board";
export type Point = { x: number; y: number };
export type View = Point & { scale: number };
export const limit = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));
export function fitView(
  width: number,
  height: number,
  boardWidth: number,
  boardHeight: number,
): View {
  const scale = Math.max(
    0.02,
    Math.min((width - 32) / boardWidth, (height - 32) / boardHeight),
  );
  return {
    x: (width - boardWidth * scale) / 2,
    y: (height - boardHeight * scale) / 2,
    scale,
  };
}
export function zoomView(view: View, point: Point, factor: number): View {
  const scale = limit(view.scale * factor, 0.02, 6);
  return {
    x: point.x - ((point.x - view.x) * scale) / view.scale,
    y: point.y - ((point.y - view.y) * scale) / view.scale,
    scale,
  };
}
export const normalRotation = (degrees: number) =>
  ((((degrees + 180) % 360) + 360) % 360) - 180;
export const sameGeometry = (a: BoardNode, b: BoardNode) =>
  ["x", "y", "width", "height", "fontSize"].every(
    (key) => Math.abs(a[key as "x"] - b[key as "x"]) < 0.001,
  ) && Math.abs(normalRotation(a.rotation - b.rotation)) < 0.001;
/** 手势开始前文本面板可能尚未 flush；只合并实际变动的几何字段。 */
export function mergeGeometry(
  current: BoardNode,
  before: BoardNode,
  after: BoardNode,
): BoardNode {
  const next = { ...current };
  (["x", "y", "width", "height", "fontSize", "rotation"] as const).forEach(
    (key) => {
      const difference =
        key === "rotation"
          ? normalRotation(after[key] - before[key])
          : after[key] - before[key];
      if (Math.abs(difference) >= 0.001) next[key] = after[key];
    },
  );
  return next;
}
export function strokeNode(points: Point[], color: string, fontSize: number) {
  let x = Infinity,
    y = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  points.forEach((point) => {
    x = Math.min(x, point.x);
    y = Math.min(y, point.y);
    right = Math.max(right, point.x);
    bottom = Math.max(bottom, point.y);
  });
  const width = Math.max(1, right - x),
    height = Math.max(1, bottom - y),
    step = Math.max(1, Math.ceil(points.length / 1999));
  const simplified = points.filter((_, index) => index % step === 0);
  if (simplified.at(-1) !== points.at(-1)) simplified.push(points.at(-1)!);
  return makeNode("stroke", {
    x,
    y,
    width,
    height,
    color,
    fontSize,
    points: simplified.map((point) => [
      (point.x - x) / width,
      (point.y - y) / height,
    ]),
  });
}
