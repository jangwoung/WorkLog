import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './api/auth/[...nextauth]/route';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Redirect to login if not authenticated, otherwise to inbox
  if (!session) {
    redirect('/login');
  } else {
    redirect('/inbox');
  }
}
