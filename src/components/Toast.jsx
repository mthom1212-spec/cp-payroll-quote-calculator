import { useEffect } from 'react';
import { Icon } from './Icons';

// Small slide-in confirmation for user actions.
// Kinds: 'success' (emerald), 'info' (navy), 'destructive' (rose).
export default function Toast({ toast, onDismiss, duration = 3200 }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => onDismiss(), duration);
    return () => clearTimeout(t);
  }, [toast, duration, onDismiss]);

  if (!toast) return null;

  const kind = toast.kind || 'success';
  const bg =
    kind === 'destructive' ? 'bg-rose-500'
    : kind === 'info' ? 'bg-brand-navy'
    : 'bg-emerald-500';

  return (
    <div className="fixed bottom-6 right-6 z-50 no-print" role="status" aria-live="polite">
      <div className="toast-in flex items-center gap-3 bg-white border border-stone-200 rounded-xl shadow-lg pl-3 pr-4 py-3 min-w-[240px] max-w-sm">
        <span className={`w-6 h-6 flex-shrink-0 rounded-full grid place-items-center text-white ${bg}`} aria-hidden="true">
          {kind === 'destructive'
            ? <Icon.X className="w-3 h-3" />
            : <Icon.Check className="w-3 h-3" />}
        </span>
        <span className="text-sm text-slate-800 font-medium flex-1">
          {toast.message}
        </span>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 transition-colors -mr-1"
          aria-label="Dismiss notification"
        >
          <Icon.X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
