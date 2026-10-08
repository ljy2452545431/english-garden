export const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));
export function localPoint(
  x: number,
  y: number,
  rect: { left: number; top: number; width: number; height: number },
  width: number,
  height: number,
): [number, number] {
  return [
    ((x - rect.left) * width) / rect.width,
    ((y - rect.top) * height) / rect.height,
  ];
}
export function boundBox<
  T extends { x: number; y: number; width: number; height: number },
>(box: T, width: number, height: number): T {
  const w = clamp(box.width, 24, width),
    h = clamp(box.height, 24, height);
  return {
    ...box,
    width: w,
    height: h,
    x: clamp(box.x, 0, width - w),
    y: clamp(box.y, 0, height - h),
  };
}
