import type { ReactNode } from 'react';

import { useAppConfig } from '../../context/AppConfigContext';
import Sidebar from './Sidebar';

type AppLayoutProps = {
  children?: ReactNode;
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const { config } = useAppConfig();

  return (
    <div
      className="app-shell flex min-h-screen max-w-full overflow-x-hidden"
      style={{
        ['--sidebar-bg' as string]: config.themeColors.sidebarBg,
        ['--sidebar-button-bg' as string]: config.themeColors.sidebarButtonBg,
        ['--sidebar-button-text' as string]: config.themeColors.sidebarButtonText,
        ['--sidebar-active-bg' as string]: config.themeColors.sidebarActiveBg,
        ['--sidebar-active-text' as string]: config.themeColors.sidebarActiveText,
        ['--topbar-bg' as string]: config.themeColors.topbarBg,
        ['--topbar-text' as string]: config.themeColors.topbarText,
        ['--section-title-text' as string]: config.themeColors.sectionTitleText,
        ['--section-subtitle-text' as string]: config.themeColors.sectionSubtitleText,
        ['--summary-label-text' as string]: config.themeColors.summaryLabelText,
        ['--summary-value-text' as string]: config.themeColors.summaryValueText,
        ['--table-header-bg' as string]: config.themeColors.tableHeaderBg,
        ['--table-header-text' as string]: config.themeColors.tableHeaderText,
      }}
    >
      <Sidebar />
      <main className="flex-1 overflow-x-hidden bg-slate-50 text-slate-900">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
