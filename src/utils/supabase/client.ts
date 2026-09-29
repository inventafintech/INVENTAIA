import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://eztnhqcsfhwgjwfdqxlg.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_aqyZ0O14bDbScb0F6Nzd7A_R943JOzJ";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );

