import type { SVGProps } from 'react';
import { iconPaths } from './paths';

/** 兼容既有图标组件；装饰图标默认隐藏于辅助技术，含 aria-label 时启用语义。 */
export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  absoluteStrokeWidth?: boolean;
}

function createIcon(name: keyof typeof iconPaths, diagonal = false) {
  return function IconfontIcon({ size = 24, absoluteStrokeWidth: _absoluteStrokeWidth, strokeWidth: _strokeWidth, children, ...props }: IconProps) {
    const labelled = Boolean(props['aria-label'] || props['aria-labelledby']);
    return <svg width={size} height={size} viewBox="0 0 1024 1024" fill="currentColor"
      aria-hidden={labelled ? undefined : true} role={labelled ? 'img' : undefined}
      focusable="false" {...props} data-icon-source={`iconfont:9402:${name}`}>
      <g transform={diagonal ? 'rotate(-45 512 512)' : undefined}>
        {iconPaths[name].map((path, index) => <path key={index} d={path} />)}
      </g>
      {children}
    </svg>;
  };
}

export const Sprout = createIcon('rocket', false);
export const Sun = createIcon('bulb', false);
export const ArrowUpRight = createIcon('arrowright', true);
export const ArrowRight = createIcon('arrowright', false);
export const Check = createIcon('check', false);
export const CalendarDays = createIcon('calendar', false);
export const BookOpen = createIcon('read', false);
export const Headphones = createIcon('customerservice', false);
export const Heart = createIcon('heart', false);
export const Palette = createIcon('skin', false);
export const Library = createIcon('book', false);
export const Lock = createIcon('lock', false);
export const LogOut = createIcon('logout', false);
export const ChevronLeft = createIcon('left', false);
export const ChevronRight = createIcon('right', false);
export const Flame = createIcon('fire', false);
export const Leaf = createIcon('experiment', false);
export const PenLine = createIcon('edit', false);
export const NotebookPen = createIcon('edit-square', false);
export const Menu = createIcon('menu', false);
export const X = createIcon('close', false);
export const Volume2 = createIcon('sound', false);
export const Square = createIcon('stop', false);
export const Mic = createIcon('audio', false);
export const Languages = createIcon('translate', false);
export const ArrowUp = createIcon('arrowup', false);
export const ArrowDown = createIcon('arrowdown', false);
export const Download = createIcon('download', false);
export const Upload = createIcon('upload', false);
export const CloudUpload = createIcon('cloud-upload', false);
export const Sparkles = createIcon('star', false);
export const RotateCcw = createIcon('undo', false);
export const Pause = createIcon('pause', false);
export const Play = createIcon('caret-right', false);
export const Send = createIcon('send', false);
export const RefreshCw = createIcon('reload', false);
export const Trash2 = createIcon('delete', false);
