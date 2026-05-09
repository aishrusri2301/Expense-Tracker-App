import { NextResponse } from "next/server";
import { fetchTransactions, getSupabaseServerClient } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/types";

export async function GET() {
  const transactions = await fetchTransactions();
  return NextResponse.json({ transactions });
}

export async function PATCH(request: Request) {
  const { id, category } = (await request.json()) as { id?: string; category?: string };

  if (!id || !category || !CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: "A valid transaction id and category are required." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ transaction: { id, category }, persisted: false });
  }

  const { data, error } = await supabase
    .from("transactions")
    .update({ category })
    .eq("id", id)
    .select("id, merchant, amount, category, raw_sms, transaction_date, transaction_type, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ transaction: data, persisted: true });
}
