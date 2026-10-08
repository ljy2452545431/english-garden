export type BoardKind =
  | "text"
  | "note"
  | "image"
  | "rect"
  | "ellipse"
  | "stroke";
export type BoardNode = {
  id: string;
  kind: BoardKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  color: string;
  fontSize: number;
  text: string;
  assetId: string | null;
  points: [number, number][];
};
export type BoardDocument = {
  schema: 1;
  width: number;
  height: number;
  background: string;
  nodes: BoardNode[];
};
export type BoardSummary = {
  id: string;
  title: string;
  userId: string;
  displayName: string;
  version: number;
  updatedAt: string;
};
export type BoardRecord = BoardSummary & { document: BoardDocument };
export const emptyBoard = (): BoardDocument => ({
  schema: 1,
  width: 1600,
  height: 1000,
  background: "#F7F8FA",
  nodes: [],
});
export function makeNode(
  kind: BoardKind,
  patch: Partial<BoardNode> = {},
): BoardNode {
  return {
    id: crypto.randomUUID(),
    kind,
    x: 120,
    y: 120,
    width: 280,
    height: 160,
    rotation: 0,
    fill:
      kind === "note"
        ? "#FFF1B8"
        : kind === "text" || kind === "stroke"
          ? "transparent"
          : "#E5EBF2",
    color: "#283443",
    fontSize: 28,
    text: "",
    assetId: null,
    points: [],
    ...patch,
  };
}
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
  hex = /^#[a-f0-9]{6}$/i;
const finite = (value: unknown, min: number, max: number) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;
/** 不装载任意第三方序列化对象、HTML 或外部 URL，仅保留本站画布类型。 */
export function validBoard(value: unknown): value is BoardDocument {
  if (!value || typeof value !== "object") return false;
  const doc = value as BoardDocument;
  if (
    doc.schema !== 1 ||
    !finite(doc.width, 200, 4096) ||
    !finite(doc.height, 200, 4096) ||
    typeof doc.background !== "string" ||
    !hex.test(doc.background) ||
    !Array.isArray(doc.nodes) ||
    doc.nodes.length > 100
  )
    return false;
  const ids = new Set<string>();
  return doc.nodes.every((node) => {
    if (
      !node ||
      typeof node !== "object" ||
      typeof node.id !== "string" ||
      !uuid.test(node.id) ||
      ids.has(node.id)
    )
      return false;
    ids.add(node.id);
    if (
      !["text", "note", "image", "rect", "ellipse", "stroke"].includes(
        node.kind,
      ) ||
      !finite(node.x, -4096, 4096) ||
      !finite(node.y, -4096, 4096) ||
      !finite(node.width, 1, 4096) ||
      !finite(node.height, 1, 4096) ||
      !finite(node.rotation, -180, 180) ||
      !finite(node.fontSize, 8, 120)
    )
      return false;
    if (
      typeof node.fill !== "string" ||
      (node.fill !== "transparent" && !hex.test(node.fill)) ||
      typeof node.color !== "string" ||
      !hex.test(node.color) ||
      typeof node.text !== "string" ||
      node.text.length > 4000
    )
      return false;
    if (
      node.kind === "image"
        ? typeof node.assetId !== "string" || !uuid.test(node.assetId)
        : node.assetId !== null
    )
      return false;
    if (
      !Array.isArray(node.points) ||
      node.points.length > 2000 ||
      (node.kind === "stroke"
        ? node.points.length < 2
        : node.points.length !== 0)
    )
      return false;
    return node.points.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        point.every((n) => finite(n, -4096, 4096)),
    );
  });
}
export function boardAssetIds(document: BoardDocument): string[] {
  return [
    ...new Set(
      document.nodes
        .filter((node) => node.kind === "image")
        .map((node) => node.assetId!),
    ),
  ];
}
