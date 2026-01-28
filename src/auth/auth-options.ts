import type { NextAuthOptions } from 'next-auth';
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
          // admin:repo_hook required to create repository webhooks
          scope: 'read:user user:email repo admin:repo_hook',
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
      type GitHubProfile = { id?: string | number; login?: string; email?: string };
      const gh = profile as GitHubProfile;
      const githubUserId = gh.id?.toString() || account.providerAccountId;
      const githubUsername = gh.login || user.name || '';
      const githubEmail = gh.email || user.email || undefined;

      if (!githubUserId) {
        return false;
      }

      // Check if user exists
      const existingUserQuery = await usersCollection
        .where('githubUserId', '==', githubUserId)
        .limit(1)
        .get();

      const now = Timestamp.now();
      // Firestore does not accept undefined; omit optional fields when missing
      const base = {
        githubUserId,
        githubUsername,
        oauthToken: account.access_token || '', // TODO: Encrypt before storage
        connectedRepositoryIds: [] as string[],
        createdAt: now,
        updatedAt: now,
      };
      const userData = {
        ...base,
        ...(githubEmail != null && githubEmail !== '' && { githubEmail }),
        ...(account.refresh_token != null && { oauthRefreshToken: account.refresh_token }),
        ...(account.expires_at != null && {
          oauthTokenExpiresAt: Timestamp.fromMillis(account.expires_at * 1000),
        }),
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
