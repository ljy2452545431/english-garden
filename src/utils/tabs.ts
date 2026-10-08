/** 根据 WAI-ARIA Tabs 键盘约定返回目标索引；其他按键保持浏览器默认行为。 */
export function nextTabIndex(key: string, current: number, count: number): number | null {
  if (count < 1) return null;
  switch (key) {
    case 'ArrowRight': return (current + 1) % count;
    case 'ArrowLeft': return (current + count - 1) % count;
    case 'Home': return 0;
    case 'End': return count - 1;
    default: return null;
  }
}
