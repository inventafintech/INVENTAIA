import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://eztnhqcsfhwgjwfdqxlg.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_9rCRACzOuV61etcfUcDizA_SY-SldtG";

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );

