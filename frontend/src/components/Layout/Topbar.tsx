import type { ReactNode } from 'react';

type TopbarProps = {
  title: string;
  actions?: ReactNode;
};

const Topbar = ({ title, actions }: TopbarProps) => {
  return (
    <header className="theme-topbar no-print sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-[#3b4b3c] px-6 py-4 shadow-sm">
      <div>
        <h2 className="theme-main-title text-xl font-semibold">{title}</h2>
      </div>
      <div className="flex items-center gap-3">{actions}</div>
    </header>
  );
};

export default Topbar;
