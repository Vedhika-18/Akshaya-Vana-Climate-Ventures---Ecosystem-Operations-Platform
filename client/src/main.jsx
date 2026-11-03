import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/jetbrains-mono/400.css';
import './index.css';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute, RoleGuard } from './components/guards';
import AppShell from './components/AppShell';
import { Login, Dashboard, Placeholder, NotFound } from './pages';

function App() {
  return <AuthProvider><ToastProvider><Routes><Route path="/login" element={<Login />} /><Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}><Route path="/" element={<Dashboard />} /><Route path="/projects" element={<Placeholder title="Projects" />} /><Route path="/projects/new" element={<RoleGuard roles={['ADMIN', 'MANAGER']}><Placeholder title="New project" /></RoleGuard>} /><Route path="/projects/:id" element={<Placeholder title="Project workspace" />} /><Route path="/projects/:id/edit" element={<RoleGuard roles={['ADMIN', 'MANAGER']}><Placeholder title="Edit project" /></RoleGuard>} /><Route path="/users" element={<RoleGuard roles={['ADMIN']}><Placeholder title="Users" /></RoleGuard>} /></Route><Route path="/404" element={<NotFound />} /><Route path="*" element={<Navigate to="/404" replace />} /></Routes></ToastProvider></AuthProvider>;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter><App /></BrowserRouter>
  </StrictMode>,
);
