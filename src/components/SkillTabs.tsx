import { useRef, type ComponentType } from 'react';
import { nextTabIndex } from '../utils/tabs';
import { zh as t } from '../i18n/zh';
import type { IconProps } from './icons';

interface SkillTabsProps<T extends string> {
  items: readonly (readonly [T, string, ComponentType<IconProps>])[];
  value: T;
  disabled: boolean;
  onChange: (value: T) => void;
}

export function SkillTabs<T extends string>({ items, value, disabled, onChange }: SkillTabsProps<T>) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  return <div className="skill-tabs" role="tablist" aria-label={t.classroomTabs}>
    {items.map(([id, label, Icon], index) => <button
      ref={node => { buttons.current[index] = node; }}
      key={id}
      id={`skill-tab-${id}`}
      role="tab"
      aria-selected={value === id}
      aria-controls="classroom-panel"
      tabIndex={value === id ? 0 : -1}
      className={value === id ? 'active' : ''}
      disabled={disabled}
      onClick={() => onChange(id)}
      onKeyDown={event => {
        const next = nextTabIndex(event.key, index, items.length);
        if (next === null || disabled) return;
        event.preventDefault();
        onChange(items[next][0]);
        buttons.current[next]?.focus();
      }}
    ><Icon size={20}/><span>{label}</span></button>)}
  </div>;
}
