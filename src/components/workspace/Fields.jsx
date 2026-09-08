import { useId } from 'react';

export function Field({ label, hint, value, onChange, type = 'number', optional = false, min = 0, max, step = 1, ...rest }) {
  const id = useId();
  return <div className="qw-field">
    <label htmlFor={id}>{label}</label>
    <input id={id} type={type} value={value ?? ''} min={type === 'number' ? min : undefined}
      max={max} step={type === 'number' ? step : undefined} aria-describedby={hint ? id + '-hint' : undefined}
      onChange={event => {
        const raw = event.target.value;
        if (type !== 'number') return onChange(raw);
        if (raw === '' && optional) return onChange('');
        const number = Number(raw);
        if (!Number.isFinite(number)) return;
        onChange(Math.min(max ?? Infinity, Math.max(min, step === 1 ? Math.trunc(number) : number)));
      }} {...rest} />
    {hint && <small id={id + '-hint'}>{hint}</small>}
  </div>;
}

export function Check({ label, checked, onChange, disabled = false }) {
  return <label className="qw-check">
    <input type="checkbox" checked={!!checked} onChange={onChange} disabled={disabled} />
    <span>{label}</span>
  </label>;
}

export function Panel({ title, subtitle, children, className = '' }) {
  return <section className={'qw-panel ' + className}>
    <div className="qw-panel-heading"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
    {children}
  </section>;
}
