import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/jetbrains-mono/400.css';
import './index.css';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute, RoleGuard } from './components/guards';
import AppShell from './components/AppShell';
import { Login, Dashboard, Users, Placeholder, NotFound } from './pages';
import { Projects, NewProject, EditProject, ProjectDetail } from './projectPages';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled application error', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <div className="flex min-h-screen items-center justify-center bg-forest px-5 text-center text-muted"><div><span className="eyebrow">Application error</span><h1 className="mt-5 font-display text-4xl text-white">Something went wrong</h1><p className="mt-3">We could not load this workspace.</p><div className="mt-7 flex justify-center gap-3"><button className="btn-glow" onClick={() => window.location.reload()}>Reload</button><Link className="btn-secondary" to="/">Back to dashboard</Link></div></div></div>;
  }
}

function App() {
  return <AuthProvider><ToastProvider><Routes><Route path="/login" element={<Login />} /><Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}><Route path="/" element={<Dashboard />} /><Route path="/projects" element={<Projects />} /><Route path="/projects/new" element={<RoleGuard roles={['ADMIN', 'MANAGER']}><NewProject /></RoleGuard>} /><Route path="/projects/:id" element={<ProjectDetail />} /><Route path="/projects/:id/edit" element={<RoleGuard roles={['ADMIN', 'MANAGER']}><EditProject /></RoleGuard>} /><Route path="/users" element={<RoleGuard roles={['ADMIN']}><Users /></RoleGuard>} /></Route><Route path="/404" element={<NotFound />} /><Route path="*" element={<Navigate to="/404" replace />} /></Routes></ToastProvider></AuthProvider>;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter><ErrorBoundary><App /></ErrorBoundary></BrowserRouter>
  </StrictMode>,
);
