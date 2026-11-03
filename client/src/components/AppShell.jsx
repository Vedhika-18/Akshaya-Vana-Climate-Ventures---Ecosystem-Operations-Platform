import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, roleLabels } from '../context/AuthContext';
import { Button, Badge } from './ui';

function Leaf({ className = '' }) { return <span className={`text-2xl text-primary ${className}`} aria-hidden="true">❧</span>; }

export default function AppShell() {
  const { user, logout } = useAuth();
  const [drawer, setDrawer] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { const close = (event) => event.key === 'Escape' && setDrawer(false); document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close); }, []);
  const links = [{ to: '/', label: 'Dashboard', icon: '⌂' }, { to: '/projects', label: 'Projects', icon: '◈' }];
  if (user?.role === 'ADMIN') links.push({ to: '/users', label: 'Users', icon: '♧' });
  const nav = <nav className="space-y-1" aria-label="Primary navigation">{links.map((link) => <NavLink key={link.to} onClick={() => setDrawer(false)} to={link.to} end={link.to === '/'} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${isActive ? 'bg-primary/15 font-semibold text-primary' : 'text-muted hover:bg-surface-2 hover:text-white'}`}><span aria-hidden="true">{link.icon}</span>{link.label}</NavLink>)}</nav>;
  const signOut = async () => { await logout(); navigate('/login'); };
  return <div className="min-h-screen bg-forest text-muted">
    <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-border bg-surface p-6 transition-transform lg:translate-x-0 ${drawer ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Sidebar">
      <div className="flex items-center gap-3"><img src="/logo.png" alt="Akshaya Vana" className="h-10 w-10 object-contain" onError={(event) => { event.currentTarget.style.display = 'none'; event.currentTarget.nextElementSibling.style.display = 'inline'; }} /><Leaf className="hidden" /><div><p className="font-display text-lg text-white">Akshaya Vana</p><p className="text-[10px] uppercase tracking-widest text-faint">Climate operations</p></div></div>
      <div className="mt-12">{nav}</div>
      <div className="absolute bottom-6 left-6 right-6 rounded-xl border border-border bg-surface-2 p-4"><p className="text-xs text-faint">Workspace</p><p className="mt-1 truncate text-sm text-white">{user?.name}</p><p className="mt-1 text-xs text-primary">{roleLabels[user?.role]}</p></div>
    </aside>
    {drawer && <button className="fixed inset-0 z-30 bg-black/60 lg:hidden" aria-label="Close navigation" onClick={() => setDrawer(false)} />}
    <div className="lg:pl-72"><header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-border bg-forest/90 px-5 backdrop-blur md:px-8"><button className="rounded-lg p-2 text-xl text-white focus:outline-none focus:ring-2 focus:ring-primary lg:hidden" onClick={() => setDrawer(true)} aria-label="Open navigation">☰</button><div className="hidden sm:block"><p className="text-xs uppercase tracking-widest text-faint">Ecosystem operations platform</p><p className="mt-1 text-sm text-muted">Regenerating landscapes, measured with care.</p></div><div className="ml-auto flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm text-white">{user?.name}</p><p className="text-xs text-muted">{roleLabels[user?.role]}</p></div><Badge>{user?.role}</Badge><Button variant="secondary" className="px-3 py-2 text-xs" onClick={signOut}>Log out</Button></div></header><main className="mx-auto max-w-[1440px] p-5 md:p-8"><Outlet /></main></div>
  </div>;
}
