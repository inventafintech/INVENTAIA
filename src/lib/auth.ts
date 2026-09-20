import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  providers: [
    // 1. Proveedor oficial de Google OAuth 2.0
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid profile email',
        },
      },
    }),

    // 2. Proveedor de credenciales para desarrollo local sin conexión obligatoria a GCP
    ...(process.env.NODE_ENV === 'development'
      ? [
          CredentialsProvider({
            id: 'credentials',
            name: 'Desarrollo Local',
            credentials: {
              email: { label: 'Email', type: 'text' },
              name: { label: 'Nombre', type: 'text' },
            },
            async authorize(credentials) {
              const email = credentials?.email || 'jmgonzalez.contact@gmail.com';
              const name = credentials?.name || 'José González';
              const user = db.upsertUser({
                email,
                name,
                avatar_url:
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                google_id: `dev-${Date.now()}`,
              });
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.avatar_url,
              };
            },
          }),
        ]
      : []),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 14 * 24 * 60 * 60, // 14 días
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (user.email) {
        // Guardar o actualizar al usuario en la base de datos (tabla users)
        const dbUser = db.upsertUser({
          name: user.name || (profile as any)?.name || 'Usuario',
          email: user.email,
          avatar_url: user.image || (profile as any)?.picture,
          google_id: account?.providerAccountId || (user as any).id,
        });
        user.id = dbUser.id;

        // Si la autenticación es Google, guardar tokens en oauth_tokens
        if (account?.provider === 'google' && account.access_token) {
          db.saveOAuthToken('google', {
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            scope: account.scope,
          });

          db.addLog(
            'google',
            'SUCCESS',
            'NEXTAUTH_GOOGLE_SIGNIN',
            'EXITOSO',
            `Usuario ${user.email} autenticado mediante Google OAuth 2.0.`
          );
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      if (token.id) {
        // Evaluar si el usuario ya tiene un workspace asociado
        const userWorkspaces = db.getUserWorkspaces(token.id as string);
        token.hasWorkspace = userWorkspaces.length > 0;
        token.workspace = userWorkspaces[0] || null;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id;
        (session.user as any).hasWorkspace = token.hasWorkspace;
        (session.user as any).workspace = token.workspace;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/onboarding`;
    },
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    'inventa-enterprise-nextauth-secret-key-2026',
};
