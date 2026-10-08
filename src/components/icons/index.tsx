import type { SVGProps } from 'react';
import { iconPaths } from './paths';

/** 兼容既有图标组件；装饰图标默认隐藏于辅助技术，含 aria-label 时启用语义。 */
export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  absoluteStrokeWidth?: boolean;
}

function createIcon(name: keyof typeof iconPaths, collection: 9402 | 23534, diagonal = false) {
  return function IconfontIcon({ size = 24, absoluteStrokeWidth: _absoluteStrokeWidth, strokeWidth: _strokeWidth, children, ...props }: IconProps) {
    const labelled = Boolean(props['aria-label'] || props['aria-labelledby']);
    return <svg width={size} height={size} viewBox="0 0 1024 1024" fill="currentColor"
      aria-hidden={labelled ? undefined : true} role={labelled ? 'img' : undefined}
      focusable="false" {...props} data-icon-source={`iconfont:${collection}:${name}`}>
      <g transform={diagonal ? 'rotate(-45 512 512)' : undefined}>
        {iconPaths[name].map((path, index) => <path key={index} d={path} />)}
      </g>
      {children}
    </svg>;
  };
}

export const Sprout = createIcon('plant-line', 23534, false);
export const Sun = createIcon('sun-line', 23534, false);
export const ArrowUpRight = createIcon('arrowright', 9402, true);
export const ArrowRight = createIcon('arrowright', 9402, false);
export const Check = createIcon('check', 9402, false);
export const CalendarDays = createIcon('calendar', 9402, false);
export const BookOpen = createIcon('read', 9402, false);
export const Headphones = createIcon('customerservice', 9402, false);
export const Heart = createIcon('heart', 9402, false);
export const Palette = createIcon('palette-line', 23534, false);
export const Library = createIcon('book', 9402, false);
export const Lock = createIcon('lock', 9402, false);
export const LogOut = createIcon('logout', 9402, false);
export const ChevronLeft = createIcon('left', 9402, false);
export const ChevronRight = createIcon('right', 9402, false);
export const Flame = createIcon('fire', 9402, false);
export const Leaf = createIcon('leaf-line', 23534, false);
export const PenLine = createIcon('edit', 9402, false);
export const NotebookPen = createIcon('edit-square', 9402, false);
export const Menu = createIcon('menu', 9402, false);
export const X = createIcon('close', 9402, false);
export const Volume2 = createIcon('sound', 9402, false);
export const Square = createIcon('stop', 9402, false);
export const Mic = createIcon('audio', 9402, false);
export const Languages = createIcon('translate', 9402, false);
export const ArrowUp = createIcon('arrowup', 9402, false);
export const ArrowDown = createIcon('arrowdown', 9402, false);
export const Download = createIcon('download', 9402, false);
export const Upload = createIcon('upload', 9402, false);
export const CloudUpload = createIcon('cloud-upload', 9402, false);
export const Sparkles = createIcon('star', 9402, false);
export const RotateCcw = createIcon('undo', 9402, false);
export const Pause = createIcon('pause', 9402, false);
export const Play = createIcon('caret-right', 9402, false);
export const Send = createIcon('send', 9402, false);
export const RefreshCw = createIcon('reload', 9402, false);
export const Trash2 = createIcon('delete', 9402, false);
