/** 按目标位置插入；不修改外观设置的原数组。 */
export function moveCard(
  order: string[],
  source: string,
  target: string,
): string[] {
  const from = order.indexOf(source);
  const to = order.indexOf(target);
  if (from < 0 || to < 0 || from === to) return [...order];
  const rest = order.filter((key) => key !== source);
  return [...rest.slice(0, to), source, ...rest.slice(to)];
}

export type CanvasRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};
export type Point = { x: number; y: number };
const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** 用中心坐标保存，与屏幕宽度无关；抓取偏移避免装饰在按下时跳动。 */
export function normalizedPoint(
  x: number,
  y: number,
  rect: CanvasRect,
  offset: Point = { x: 0, y: 0 },
): Point {
  return {
    x: clamp((x - rect.left - offset.x) / Math.max(1, rect.width)),
    y: clamp((y - rect.top - offset.y) / Math.max(1, rect.height)),
  };
}

export function nearestCard(
  x: number,
  y: number,
  cards: { id: string; x: number; y: number }[],
): string | undefined {
  return cards.reduce<{ id?: string; distance: number }>(
    (nearest, card) => {
      const distance = Math.hypot(x - card.x, y - card.y);
      return distance < nearest.distance ? { id: card.id, distance } : nearest;
    },
    { distance: Infinity },
  ).id;
}
