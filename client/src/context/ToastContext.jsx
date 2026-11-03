import { createContext, useContext, useState } from 'react';

const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toast = (message) => { const id = Date.now(); setToasts((items) => [...items, { id, message }]); setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4000); };
  return <ToastContext.Provider value={{ toast }}>{children}<div className="fixed bottom-4 right-4 z-[60] space-y-2" aria-live="polite">{toasts.map((item) => <div key={item.id} className="rounded-xl border border-primary/30 bg-surface-2 px-4 py-3 text-sm text-white shadow-lg">{item.message}</div>)}</div></ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
