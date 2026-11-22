// Small shared building blocks with big, easy tap targets.
import type { ReactNode } from 'react';
import { EFFORT_LABEL } from '../lib/recipes';
import type { Effort } from '../types';

export function EffortBadge({ effort }: { effort: Effort }) {
  return <span className={`badge effort-${effort}`}>{EFFORT_LABEL[effort]}</span>;
}

export function Stepper({ value, onChange, min = 1, max = 12, label, unit }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string; unit?: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="step" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <span className="step-value" aria-live="polite">{value}{unit ? ` ${unit}` : ''}</span>
      <button type="button" className="step" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'seg on' : 'seg'} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className={checked ? 'toggle on' : 'toggle'} onClick={() => onChange(!checked)}>
      <span className="knob" aria-hidden />
      <span>{label}: {checked ? 'On' : 'Off'}</span>
    </button>
  );
}

export function BackBar({ onBack, title }: { onBack: () => void; title?: string }) {
  return (
    <div className="backbar">
      <button type="button" className="back" onClick={onBack}>‹ Back</button>
      {title && <span className="backbar-title">{title}</span>}
    </div>
  );
}

export function Section({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="section" open={open}>
      <summary>{title}</summary>
      <div className="section-body">{children}</div>
    </details>
  );
}

export const kcalText = (n: number) => `${Math.round(n)} cal`;
export const minutesText = (n: number) => (n >= 60 ? `${Math.floor(n / 60)} hr${n % 60 ? ` ${n % 60} min` : ''}` : `${n} min`);
