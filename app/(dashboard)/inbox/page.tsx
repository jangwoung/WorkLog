import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export default async function InboxPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Inbox</h1>
      <p>Pending AssetCards will appear here.</p>
      <p style={{ color: '#666', marginTop: '1rem' }}>
        Phase 3 implementation pending - AssetCard management UI will be added here.
      </p>
    </div>
  );
}
