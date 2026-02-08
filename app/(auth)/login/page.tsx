import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/src/auth/auth-options';
import { redirect } from 'next/navigation';
import { LoginContent } from './LoginContent';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  // If already authenticated, redirect to dashboard
  if (session) {
    redirect('/inbox');
  }

  return <LoginContent />;
}
