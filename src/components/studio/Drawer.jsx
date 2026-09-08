import { useEffect, useId, useRef } from 'react';
import { Icon } from '../Icons';

export default function Drawer({ title, subtitle, onClose, children }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = before; dialog.close(); previous?.focus(); };
  }, []);
  return <dialog className="qs-drawer" ref={ref} aria-labelledby={id}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left) onClose(); } }}>
    <div className="qs-drawer-heading"><div><span className="qs-eyebrow">QUOTE BUILDER</span><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      <button className="qs-icon-button" onClick={onClose} aria-label="Close panel"><Icon.X /></button></div>
    <div className="qs-drawer-body">{children}</div>
    <div className="qs-drawer-footer"><span>Changes update your quote immediately.</span><button className="qs-button qs-primary" onClick={onClose}>Done <Icon.Check /></button></div>
  </dialog>;
}
