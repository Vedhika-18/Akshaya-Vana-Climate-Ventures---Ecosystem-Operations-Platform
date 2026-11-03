import { useEffect, useRef } from 'react';

export function Button({ variant = 'primary', loading = false, children, className = '', ...props }) {
  const variants = { primary: 'btn-glow', secondary: 'btn-secondary', outline: 'btn-outline', danger: 'rounded-full bg-red-500/15 px-5 py-2.5 font-semibold text-red-300 hover:bg-red-500/25 focus:outline-none focus:ring-2 focus:ring-red-300' };
  return <button className={`${variants[variant]} ${className}`} disabled={loading || props.disabled} {...props}>{loading ? 'Working...' : children}</button>;
}

export function Input({ label, error, id, ...props }) {
  return <label className="block space-y-2 text-sm text-muted" htmlFor={id}><span className="font-medium text-white">{label}</span><input id={id} className={`w-full rounded-xl border bg-surface-2 px-4 py-3 text-white outline-none transition placeholder:text-faint focus:border-primary focus:ring-2 focus:ring-primary/30 ${error ? 'border-red-400' : 'border-border'}`} {...props} />{error && <span className="block text-xs text-red-300" role="alert">{error}</span>}</label>;
}

export function Select({ label, id, children, ...props }) {
  return <label className="block space-y-2 text-sm text-muted" htmlFor={id}><span className="font-medium text-white">{label}</span><select id={id} className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" {...props}>{children}</select></label>;
}

export function Card({ children, className = '' }) { return <section className={`card p-5 ${className}`}>{children}</section>; }
export function ProgressBar({ value = 0 }) { return <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>; }
export function StatCard({ label, value, progress }) { return <Card><p className="text-sm text-muted">{label}</p><p className="mt-3 font-mono text-3xl text-white">{value}</p>{progress !== undefined && <div className="mt-4"><ProgressBar value={progress} /></div>}</Card>; }
export function Badge({ children, tone = 'green' }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone === 'gold' ? 'bg-gold/15 text-gold' : 'bg-primary/15 text-primary'}`}>{children}</span>; }
export function EyebrowPill({ children }) { return <span className="eyebrow">{children}</span>; }
export function Skeleton({ className = '' }) { return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} aria-hidden="true" />; }
export function EmptyState({ title, children }) { return <Card className="py-12 text-center"><p className="text-lg font-semibold text-white">{title}</p>{children && <p className="mt-2 text-sm text-muted">{children}</p>}</Card>; }
export function Table({ headers, children }) { return <div className="overflow-x-auto rounded-2xl border border-border"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-surface-2 text-xs uppercase tracking-wider text-muted"><tr>{headers.map((header) => <th className="px-5 py-3" key={header}>{header}</th>)}</tr></thead><tbody className="divide-y divide-border">{children}</tbody></table></div>; }

export function Modal({ open, onClose, title, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    ref.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div ref={ref} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="modal-title" className="card w-full max-w-lg p-6 outline-none"><div className="flex items-center justify-between"><h2 id="modal-title" className="font-display text-2xl text-white">{title}</h2><button className="text-2xl text-muted focus:outline-none focus:ring-2 focus:ring-primary" onClick={onClose} aria-label="Close dialog">×</button></div><div className="mt-5">{children}</div></div></div>;
}
export function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', children }) { return <Modal open={open} onClose={onClose} title={title}><p className="text-muted">{children}</p><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={onConfirm}>Confirm</Button></div></Modal>; }
