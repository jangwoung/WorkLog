import NextAuth, { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import { getUsersCollection } from '@/src/infrastructure/firestore/collections';
import { Timestamp } from '@google-cloud/firestore';
import type { User } from '@/src/models/user.model';

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !profile || account.provider !== 'github') {
        return false;
      }

      // Store or update user in Firestore
      const usersCollection = getUsersCollection();
      const githubUserId = profile.id?.toString() || account.providerAccountId;
      const githubUsername = profile.login || user.name || '';
      const githubEmail = profile.email || user.email || undefined;

      if (!githubUserId) {
        return false;
      }

      // Check if user exists
      const existingUserQuery = await usersCollection
        .where('githubUserId', '==', githubUserId)
        .limit(1)
        .get();

      const now = Timestamp.now();
      const userData: Omit<User, 'userId'> = {
        githubUserId,
        githubUsername,
        githubEmail,
        oauthToken: account.access_token || '', // TODO: Encrypt before storage
        oauthRefreshToken: account.refresh_token,
        oauthTokenExpiresAt: account.expires_at
          ? Timestamp.fromMillis(account.expires_at * 1000)
          : undefined,
        connectedRepositoryIds: [],
        createdAt: now,
        updatedAt: now,
      };

      if (!existingUserQuery.empty) {
        // Update existing user
        const existingUserDoc = existingUserQuery.docs[0];
        await existingUserDoc.ref.update({
          ...userData,
          updatedAt: now,
        });
        // Set userId for session
        user.id = existingUserDoc.id;
      } else {
        // Create new user
        const newUserRef = usersCollection.doc();
        await newUserRef.set({
          ...userData,
          userId: newUserRef.id,
        });
        user.id = newUserRef.id;
      }

      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        token.accessToken = account.access_token;
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
