import React, { PropsWithChildren, ReactNode } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/main.css';

const LAYOUT = {
  headerHeight: 64,
  sidebarWidth: 240,
  toolbarHeight: 48,
  statusBarHeight: 32,
};

export default function MainLayout({
  children,
  sidebarChildren,
  toolbarLeft,
  toolbarRight,
  statusLeft,
  statusCenter,
  statusRight,
}: PropsWithChildren<{
  sidebarChildren?: ReactNode;
  toolbarLeft?: ReactNode;
  toolbarRight?: ReactNode;
  statusLeft?: ReactNode;
  statusCenter?: ReactNode;
  statusRight?: ReactNode;
}>) {
  return (
    <div className="gv-root">
      <header className="gv-header" style={{ height: LAYOUT.headerHeight }}>
        <Header />
      </header>

      <div className="gv-body">
        <aside className="gv-sidebar" style={{ width: LAYOUT.sidebarWidth }}>
          {/* カスタム sidebarContent があれば表示、なければデフォルト Sidebar */}
          {sidebarChildren ?? <Sidebar />}
        </aside>

        <main className="gv-content">
          <div className="gv-toolbar" style={{ height: LAYOUT.toolbarHeight }}>
            <div className="gv-toolbar-left">{toolbarLeft ?? null}</div>
            <div className="gv-toolbar-right">{toolbarRight ?? null}</div>
          </div>

          <div className="gv-main-area">{children}</div>

          <div className="gv-statusbar" style={{ height: LAYOUT.statusBarHeight }}>
            <div className="gv-status-left">{statusLeft ?? '読み込み中…'}</div>
            <div className="gv-status-center">{statusCenter ?? null}</div>
            <div className="gv-status-right">{statusRight ?? 'v1.0.0'}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
