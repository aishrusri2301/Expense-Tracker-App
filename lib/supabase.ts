import { createClient } from "@supabase/supabase-js";
import type { Transaction } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && serviceRoleKey);

export function getSupabaseServerClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select("id, merchant, amount, category, raw_sms, transaction_date, transaction_type, created_at")
    .order("transaction_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch transactions", error);
    return [];
  }

  return (data ?? []) as Transaction[];
}
