import { NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import {
  defaultSiteSettings,
  getPublicSettingsRequest,
  type SiteSettings,
} from '../../api/settings.api';

const navItems = [
  { label: 'Cronograma', to: '/public/cronograma' },
  { label: 'Charlas', to: '/public/charlas' },
  { label: 'Talleres', to: '/public/talleres' },
  { label: 'Competencias', to: '/public/competencias' },
  { label: 'Torneos', to: '/public/torneos' },
  { label: 'FCI Admin', to: '/login' },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-full px-3 py-2 text-sm font-semibold transition-colors',
    isActive ? 'bg-[#5adf82] text-[#003917]' : 'text-[#b9cbb8] hover:bg-[#1d2022] hover:text-[#5adf82]',
  ].join(' ');

type PublicLayoutProps = {
  children: ReactNode;
};

const PublicLayout = ({ children }: PublicLayoutProps) => {
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    getPublicSettingsRequest()
      .then(setSettings)
      .catch(() => setSettings(defaultSiteSettings));
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-[#101415] text-[#e0e3e5]">
      <header className="sticky top-0 z-50 border-b border-[#3b4b3c] bg-[#101415]/90 backdrop-blur">
        <nav className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-4 py-3 md:h-20 md:px-12 md:py-0">
          <NavLink to="/public" className="flex min-w-0 items-center gap-3">
            {settings.logoUrl ? (
              <img
                className="h-10 w-10 shrink-0 rounded-lg object-cover"
                src={settings.logoUrl}
                alt={settings.brandName}
              />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#5adf82] text-[#003917]">
                <span className="material-symbols-outlined">engineering</span>
              </span>
            )}
            <span className="truncate font-display text-lg font-extrabold tracking-tight text-[#5adf82] sm:text-xl">
              {settings.brandName}
            </span>
          </NavLink>
          <div className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <NavLink key={item.label} to={item.to} className={navClass} end>
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#3b4b3c] bg-[#151b1c] text-[#e0e3e5] transition-colors hover:border-[#5adf82] hover:text-[#5adf82] md:hidden"
              aria-label={isMobileMenuOpen ? 'Cerrar menu de navegacion' : 'Abrir menu de navegacion'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="public-mobile-menu"
              onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
            >
              <span className="material-symbols-outlined text-[26px]">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </nav>
        <div
          id="public-mobile-menu"
          className={[
            'border-t border-[#263526] bg-[#101415] px-4 pb-4 shadow-[0_18px_40px_rgba(0,0,0,0.28)] md:hidden',
            isMobileMenuOpen ? 'block' : 'hidden',
          ].join(' ')}
        >
          <div className="mx-auto grid max-w-7xl gap-2 pt-3">
            {navItems.map((item) => (
              <NavLink key={item.label} to={item.to} className={navClass} end>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-[#3b4b3c] bg-[#0b0f10]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 md:flex-row md:items-center md:justify-between md:px-12">
          <div>
            <p className="font-display text-xl font-bold text-[#5adf82]">{settings.brandName}</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-[#b9cbb8]">
              Facultad de Ciencias e Ingeniería de la Universidad de Manizales.
            </p>
            <a
              className="mt-2 inline-block text-xs font-medium text-[#8fa18e] transition-colors hover:text-[#5adf82]"
              href="https://www.linkedin.com/in/jhon-sebastian-diaz-villa-6ab0a51ab"
              target="_blank"
              rel="noreferrer"
            >
              Desarrollado por: Jhon Sebastian Diaz
            </a>
          </div>
          <div className="flex flex-wrap gap-6 text-sm font-semibold text-[#b9cbb8]">
            <a
              className="hover:text-[#5adf82]"
              href="https://umanizales.edu.co/contacto"
              target="_blank"
              rel="noreferrer"
            >
              Contacto
            </a>
            <a
              className="hover:text-[#5adf82]"
              href="https://umanizales.edu.co/"
              target="_blank"
              rel="noreferrer"
            >
              UManizales
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
