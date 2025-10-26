// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Username or Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const { email, password } = credentials;

        // 🔐 Replace with real validation later
        if (email === 'bobi02' && password === 'Dune2001') {
          return {
            id: 1,
            name: 'Bobi',
            email: 'bobi02@example.com',
          };
        }

        // ❌ Wrong credentials
        throw new Error('Invalid username or password');
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'whistle-secret',
  pages: {
    signIn: '/auth', // optional: where to redirect if sign-in fails
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.user = user;
      return token;
    },
    async session({ session, token }) {
      if (token?.user) session.user = token.user;
      return session;
    },
  },
});
