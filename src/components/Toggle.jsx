export default function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`toggle-track ${checked ? 'active' : 'inactive'}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    />
  );
}
