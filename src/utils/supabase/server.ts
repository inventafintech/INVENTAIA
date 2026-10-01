import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://eztnhqcsfhwgjwfdqxlg.supabase.co";
// Servidor: prefiere service_role (bypassa RLS; la autorización la hace la
// app con requireWorkspace). Solo cae a la publishable si no hay service key
// (desarrollo local sin backend privilegiado).
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_aqyZ0O14bDbScb0F6Nzd7A_R943JOzJ";

export const createClient = async () => {
  const cookieStore = await cookies();
  
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Ignorar en componentes de servidor (lectura)
          }
        },
      },
    },
  );
};

