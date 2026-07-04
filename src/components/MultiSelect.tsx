import { useEffect, useState, useRef } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface MultiSelectProps {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({ options, value, onChange, placeholder = 'Select...' }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  const labels = options.filter((o) => value.includes(o.value)).map((o) => o.label);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input text-left flex items-center justify-between"
      >
        <span className={labels.length ? 'text-ink-900' : 'text-ink-400'}>
          {labels.length ? labels.join(', ') : placeholder}
        </span>
        <ChevronDown size={16} className={`text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-ink-200 rounded-xl shadow-lift py-1 max-h-56 overflow-y-auto animate-scale-in">
          {options.map((opt) => {
            const selected = value.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
              >
                <span>{opt.label}</span>
                {selected && <Check size={16} className="text-brand-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
