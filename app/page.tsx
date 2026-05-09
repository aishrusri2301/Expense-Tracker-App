import { Dashboard } from "@/components/dashboard";
import { sampleTransactions } from "@/lib/sample-data";
import { fetchTransactions } from "@/lib/supabase";

export default async function Home() {
  const savedTransactions = await fetchTransactions();
  const transactions = savedTransactions.length ? savedTransactions : sampleTransactions;

  return <Dashboard initialTransactions={transactions} usingSampleData={!savedTransactions.length} />;
}
