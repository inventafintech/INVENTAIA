import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '@/lib/db';
import { readTwoFactorState } from '@/lib/twoFactorStore';

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

    // Único proveedor autorizado: Google OAuth 2.0 (sin bypass demo).
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
        const { createClient } = await import('@/utils/supabase/server');
        const supabase = await createClient();
        
        const userData = {
          name: user.name || (profile as any)?.name || 'Usuario',
          email: user.email,
          avatar_url: user.image || (profile as any)?.picture,
          google_id: account?.providerAccountId || (user as any).id,
        };

        let dbUser;
        const { data: existing } = await supabase.from('users').select('*').eq('email', user.email).single();
        
        if (existing) {
            // No sobrescribir un avatar personalizado (data URL) con la foto de Google
            const keepCustomAvatar = (existing as any)?.avatar_url?.startsWith('data:');
            const { data: updated } = await supabase.from('users').update({
              name: userData.name,
              ...(keepCustomAvatar ? {} : { avatar_url: userData.avatar_url }),
              google_id: userData.google_id,
              updated_at: new Date().toISOString()
            }).eq('id', existing.id).select().single();
            dbUser = updated || existing;
        } else {
           const id = `usr-${Date.now()}`;
           const { data: inserted } = await supabase.from('users').insert({ id, ...userData }).select().single();
           dbUser = inserted;
        }
        
        if (dbUser) {
          user.id = dbUser.id;
        }

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

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.workspace_id = (user as any).workspace_id;
      }

      // Soporte para update() disparado desde useSession() en el cliente
      if (trigger === 'update' && session) {
        if (session.workspace_id) token.workspace_id = session.workspace_id;
        if (session.workspace) {
          token.workspace = session.workspace;
          token.hasWorkspace = true;
          token.workspace_id = session.workspace.id;
        }
        if (session.hasWorkspace) token.hasWorkspace = true;
        // Confirmación del segundo factor tras verificar el TOTP en /login/verify-2fa
        if ((session as any).twoFactorVerified === true) token.twoFactorVerified = true;
      }

      if (token.id) {
        const { createClient } = await import('@/utils/supabase/server');
        const supabase = await createClient();
        
        const { data: dbUser } = await supabase.from('users').select('*').eq('id', token.id as string).single();

        // La BD manda: así useSession().update() refresca nombre/avatar
        // del header en caliente tras guardar el perfil.
        if (dbUser) {
          if (dbUser.name) token.name = dbUser.name;
          // NUNCA guardar data URLs en el JWT: inflan la cookie de sesión
          // más allá del límite de headers y provocan 494 REQUEST_HEADER_TOO_LARGE.
          // El avatar pesado vive solo en la BD y el header lo lee de /api/session.
          const dbAvatar = (dbUser as any).avatar_url as string | undefined;
          if (dbAvatar && !dbAvatar.startsWith('data:')) {
            token.picture = dbAvatar;
          } else if (typeof token.picture === 'string' && token.picture.startsWith('data:')) {
            delete (token as any).picture;
          }
          // Flag de 2FA para enforcement en middleware (sin consultas extra).
          // Lee columnas o blob en `image` (automigración); nunca falla el login.
          try {
            (token as any).twoFaEnabled = Boolean(readTwoFactorState(dbUser)?.enabled);
          } catch {
            (token as any).twoFaEnabled = Boolean((dbUser as any)?.two_factor_enabled);
          }
        }
        
        if (dbUser?.workspace_id) {
          token.workspace_id = dbUser.workspace_id;
          token.hasWorkspace = true;
          const { data: ws } = await supabase.from('workspaces').select('*').eq('id', dbUser.workspace_id).single();
          if (ws) {
            // Parsear settings JSON si es necesario
            if (typeof ws.settings === 'string') {
              try { ws.settings = JSON.parse(ws.settings); } catch(e) {}
            }
            token.workspace = ws;
          }
        } else {
          // Evaluar si el usuario ya tiene un workspace asociado por membresía
          const { data: memberships } = await supabase
            .from('workspace_users')
            .select('workspace_id, role, workspaces(*)')
            .eq('user_id', token.id as string);
            
          const userWorkspaces = memberships?.map(m => m.workspaces).filter(Boolean) || [];
          token.hasWorkspace = userWorkspaces.length > 0;
          
          if (userWorkspaces[0]) {
            const ws = userWorkspaces[0] as any;
            if (typeof ws.settings === 'string') {
              try { ws.settings = JSON.parse(ws.settings); } catch(e) {}
            }
            token.workspace = ws;
            token.workspace_id = ws.id;
          } else {
            token.workspace = null;
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id;
        (session.user as any).hasWorkspace = token.hasWorkspace;
        (session.user as any).workspace = token.workspace;
        (session.user as any).workspace_id = token.workspace_id || (token.workspace as any)?.id;
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
