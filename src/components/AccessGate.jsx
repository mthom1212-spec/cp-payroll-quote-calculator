import { useEffect, useState } from 'react';
import { BrandMark } from './Icons';
import { ACCESS_CODE_HASHES, ACCESS_STORAGE_KEY, hashPasscode } from '../constants/access';

/**
 * Shared-passcode gate. Wraps the app: nothing renders until a valid passcode
 * is entered. Once accepted, the accepted hash is remembered in localStorage so
 * the rep only types it once per browser — and because we remember the *hash*,
 * removing a code from ACCESS_CODE_HASHES re-prompts anyone using it.
 *
 * Deterrent only — see the note in src/constants/access.js.
 */
export default function AccessGate({ children }) {
  // null = still checking stored access, true = unlocked, false = show the form
  const [unlocked, setUnlocked] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let remembered = null;
    try {
      remembered = localStorage.getItem(ACCESS_STORAGE_KEY);
    } catch {
      // Private window or blocked storage — just show the form.
    }
    setUnlocked(!!remembered && ACCESS_CODE_HASHES.includes(remembered));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (checking) return;
    setChecking(true);
    setError('');
    try {
      const hash = await hashPasscode(code);
      if (ACCESS_CODE_HASHES.includes(hash)) {
        try {
          localStorage.setItem(ACCESS_STORAGE_KEY, hash);
        } catch {
          // Can't remember it — they'll re-enter next load, but let them in now.
        }
        setUnlocked(true);
      } else {
        setError('That passcode isn’t right. Check with your manager and try again.');
        setCode('');
      }
    } catch {
      setError('Couldn’t verify the passcode in this browser. Make sure you’re on the https:// address.');
    } finally {
      setChecking(false);
    }
  };

  // Don't flash the passcode screen while we read localStorage.
  if (unlocked === null) return null;
  if (unlocked) return children;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 header-gradient">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-warm-lg border border-stone-200 overflow-hidden">
        <div className="bg-brand-navy text-white px-7 py-6 flex items-center gap-3">
          <BrandMark className="w-9 h-9" />
          <div>
            <div className="font-display font-bold text-lg leading-tight">Quote Builder</div>
            <div className="text-[11px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Creative Planning Payroll
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="px-7 py-6 space-y-4">
          <div>
            <label htmlFor="cpp-passcode" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Team Passcode
            </label>
            <input
              id="cpp-passcode"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(''); }}
              placeholder="Enter passcode"
              className="w-full px-3 py-2.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 leading-snug">{error}</p>
          )}

          <button
            type="submit"
            disabled={!code || checking}
            className="w-full py-2.5 rounded-lg bg-brand-navy text-white text-sm font-semibold tracking-wide hover:bg-brand-navyLight transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {checking ? 'Checking…' : 'Continue'}
          </button>

          <p className="text-[11px] text-slate-400 leading-snug pt-1">
            For Creative Planning Payroll sales use. You’ll only need to enter this
            once on this computer. Ask your manager if you don’t have the passcode.
          </p>
        </form>
      </div>
    </div>
  );
}
