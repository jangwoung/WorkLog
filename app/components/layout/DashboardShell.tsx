'use client';

import { Header } from './Header';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '1.5rem' }}>{children}</main>
    </div>
  );
}
