/** 空白和非法输入不能成为官方原始分。本站仅记录用户对照答案后的自填结果。 */
export function parseRawScore(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{1,2}$/.test(trimmed)) return null;
  const score = Number(trimmed);
  return score <= 40 ? score : null;
}

/** 以墙钟截止时间计算，标签页在后台时也不会逐秒漂移。 */
export function remainingSeconds(end: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((end - now) / 1000));
}
