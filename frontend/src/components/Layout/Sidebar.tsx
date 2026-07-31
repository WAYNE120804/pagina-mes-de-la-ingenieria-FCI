import { useState } from 'react';
import { NavLink } from 'react-router-dom';

import { useAppConfig } from '../../context/AppConfigContext';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/admin', label: 'Inicio' },
  { to: '/usuarios', label: 'Usuarios' },
  { to: '/espacios', label: 'Espacios' },
  { to: '/eventos', label: 'Eventos' },
  { to: '/competencias', label: 'Competencias' },
  { to: '/ponentes', label: 'Ponentes' },
  { to: '/asistencia', label: 'Asistencia' },
  { to: '/inscritos', label: 'Inscritos' },
  { to: '/torneos', label: 'Torneos' },
  { to: '/reportes', label: 'Reportes' },
  { to: '/notificaciones', label: 'Notificaciones' },
  { to: '/auditoria', label: 'Auditoría' },
  { to: '/configuracion', label: 'Configuración' },
];

const Sidebar = () => {
  const { config } = useAppConfig();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const initials = (user?.name || config.nombreNegocio || 'SI')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <>
      <aside className="theme-sidebar no-print sticky top-0 z-30 flex h-screen w-20 flex-col items-center border-r border-slate-200 px-3 py-4">
        <button
          className="group flex h-12 w-12 flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          type="button"
          aria-label="Abrir menú"
          onClick={() => setOpen(true)}
        >
          <span className="block h-0.5 w-6 rounded-full bg-current transition group-hover:w-7" />
          <span className="block h-0.5 w-6 rounded-full bg-current transition group-hover:w-7" />
          <span className="block h-0.5 w-6 rounded-full bg-current transition group-hover:w-7" />
        </button>

        <div className="mt-5 flex flex-col items-center gap-2">
          {config.logoDataUrl ? (
            <img
              src={config.logoDataUrl}
              alt={config.nombreNegocio}
              className="h-11 w-11 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {config.nombreNegocio.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="mt-auto flex w-full flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-3 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {initials}
          </div>
          <p className="line-clamp-2 max-w-14 break-words text-[11px] font-semibold leading-tight text-slate-900">
            {user?.name}
          </p>
        </div>
      </aside>

      {open ? (
        <div className="no-print fixed inset-0 z-40">
          <button
            className="absolute inset-0 bg-slate-900/30"
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <aside className="theme-sidebar relative flex h-full w-[min(300px,calc(100vw-32px))] flex-col border-r border-slate-200 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {config.logoDataUrl ? (
                  <img
                    src={config.logoDataUrl}
                    alt={config.nombreNegocio}
                    className="h-12 w-12 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {config.nombreNegocio.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h1 className="theme-main-title text-lg font-semibold text-slate-800">
                    {config.nombreNegocio}
                  </h1>
                  <p className="text-xs text-slate-500">Panel operativo</p>
                </div>
              </div>
              <button
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() => setOpen(false)}
              >
                Cerrar
              </button>
            </div>

            <nav className="mt-6 flex flex-col gap-2 text-sm">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `theme-nav-label rounded-md px-3 py-2 transition-colors ${
                      isActive ? 'theme-sidebar-link-active' : 'theme-sidebar-link'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
              <p className="font-semibold uppercase tracking-[0.08em] text-slate-500">Sesion</p>
              <p className="mt-2 font-semibold text-slate-900">{user?.name}</p>
              <p className="mt-1 break-all">{user?.email}</p>
              <button
                className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.06em] text-slate-700 transition hover:bg-slate-50"
                type="button"
                onClick={() => void logout()}
              >
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
};

export default Sidebar;
