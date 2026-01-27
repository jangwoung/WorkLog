import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/src/auth/auth-options';
import { redirect } from 'next/navigation';
import { SignIn } from '@/app/components/auth/SignIn';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  // If already authenticated, redirect to dashboard
  if (session) {
    redirect('/inbox');
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '2rem'
    }}>
      <h1 style={{ marginBottom: '2rem' }}>WorkLog</h1>
      <p style={{ marginBottom: '2rem', color: '#666' }}>
        Transform GitHub development activity into reusable, evaluation-ready career assets.
      </p>
      <SignIn />
    </div>
  );
}
