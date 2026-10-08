import { Leaf, Sun, Heart, BookOpen } from "./icons";
import type { Decoration } from "../utils/preferences";
const icons = { leaf: Leaf, sun: Sun, heart: Heart, book: BookOpen };
/** 装饰限定在独立页眉，不覆盖学习正文或按钮。 */
export function DecorationStrip({ items }: { items: Decoration[] }) {
  if (!items.length) return null;
  return (
    <div className="decoration-strip" aria-hidden="true">
      {items.map((item) => {
        const Icon = icons[item.kind];
        return (
          <span
            key={item.id}
            style={{
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
              transform: `translate(-50%,-50%) rotate(${item.rotation}deg)`,
            }}
          >
            <Icon size={24} />
          </span>
        );
      })}
    </div>
  );
}
