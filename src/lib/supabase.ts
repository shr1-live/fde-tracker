import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const supabase = url && key ? createClient(url, key) : null;
export const ALLOWED_DOMAIN = ((import.meta.env.VITE_ALLOWED_DOMAIN as string | undefined) ?? "fiftyfivetech.io").toLowerCase();
export const isOfficeEmail = (e: string) => e.trim().toLowerCase().endsWith("@" + ALLOWED_DOMAIN);
export const ADMIN_EMAIL = ((import.meta.env.VITE_ADMIN_EMAIL as string | undefined) ?? "shivanshu.rai@fiftyfivetech.io").toLowerCase(); // UI hint only; real enforcement is in the database
