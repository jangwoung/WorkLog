import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/src/auth/auth-options';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/app/components/layout/DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  return <DashboardShell>{children}</DashboardShell>;
}
