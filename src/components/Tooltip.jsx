// Tiny contextual ? tooltip. CSS-only via group-hover for zero JS overhead.
// Usage: <Tooltip>Explanation of what this field does</Tooltip>
export default function Tooltip({ children, side = 'top' }) {
  return (
    <span className="relative inline-flex group ml-1 align-middle">
      <span
        aria-hidden="true"
        className="inline-grid place-items-center w-3.5 h-3.5 rounded-full bg-brand-navy/10 text-brand-navy text-[9px] font-bold cursor-help"
      >?</span>
      <span
        role="tooltip"
        className={`
          pointer-events-none absolute z-50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
          transition-opacity duration-150
          bg-slate-800 text-white text-[11px] font-normal normal-case tracking-normal leading-snug
          rounded-md py-1.5 px-2.5 shadow-lg
          w-56
          ${side === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' : 'top-full left-1/2 -translate-x-1/2 mt-2'}
        `}
      >
        {children}
      </span>
    </span>
  );
}
