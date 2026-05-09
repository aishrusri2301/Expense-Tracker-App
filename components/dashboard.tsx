"use client";

import { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Loader2, Moon, Sparkles, Sun, Wand2 } from "lucide-react";
import { buildMetrics, formatCurrency, formatDate } from "@/lib/analytics";
import { CATEGORIES, type ExpenseCategory, type Transaction } from "@/lib/types";

const CHART_COLORS = ["#fb8bbd", "#7cc7ff", "#70df9d", "#b69cff", "#ffd166", "#ff9f8f", "#83e6d6", "#a5b4fc", "#d1d5db"];
const SAMPLE_SMS = `HDFC Bank: Rs 450 spent at DMART using Debit Card\n\nICICI: INR 630 debited at Zomato on 02-May-2026\n\nYour OTP is 440922. Do not share it with anyone.`;

type DashboardProps = {
  initialTransactions: Transaction[];
  usingSampleData: boolean;
};

export function Dashboard({ initialTransactions, usingSampleData }: DashboardProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [rawSms, setRawSms] = useState(SAMPLE_SMS);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(usingSampleData ? "Showing friendly demo data until Supabase has saved transactions." : null);
  const [darkMode, setDarkMode] = useState(false);
  const [isPending, startTransition] = useTransition();
  const metrics = useMemo(() => buildMetrics(transactions), [transactions]);

  async function parseMessages() {
    setError(null);
    setNotice(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawSms })
        });
        const payload = await response.json();

        if (!response.ok) throw new Error(payload.error ?? "Unable to parse SMS messages.");

        if (payload.transactions?.length) {
          setTransactions((current) => [...payload.transactions, ...current.filter((transaction) => !transaction.id.startsWith("demo-"))]);
        }

        const ignoredCount = payload.ignored?.length ?? 0;
        setNotice(
          `${payload.transactions?.length ?? 0} transaction${payload.transactions?.length === 1 ? "" : "s"} added${ignoredCount ? `, ${ignoredCount} alert${ignoredCount === 1 ? "" : "s"} ignored` : ""}. ${payload.mode === "local-demo" ? "Add OPENAI_API_KEY for AI parsing." : "Parsed with OpenAI."} ${payload.persisted ? "Saved to Supabase." : "Running in local demo mode."}`
        );
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Something went wrong.");
      }
    });
  }

  async function updateCategory(id: string, category: ExpenseCategory) {
    setTransactions((current) => current.map((transaction) => (transaction.id === id ? { ...transaction, category } : transaction)));

    if (id.startsWith("demo-") || id.startsWith("local-")) return;

    await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, category })
    });
  }

  function exportCsv() {
    const header = ["Merchant", "Amount", "Category", "Type", "Transaction Date", "Raw SMS"];
    const rows = transactions.map((transaction) => [
      transaction.merchant,
      transaction.amount,
      transaction.category,
      transaction.transaction_type ?? "unknown",
      transaction.transaction_date ?? "",
      transaction.raw_sms.replace(/\n/g, " ")
    ]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "spendspark-transactions.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={clsx("min-h-screen px-4 py-6 transition-colors duration-300 sm:px-6 lg:px-8", darkMode && "dark bg-[#111124]")}> 
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="glass-card overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-purple-700 shadow-sm dark:bg-white/10 dark:text-purple-100">
                <Sparkles className="h-4 w-4" /> AI-powered money clarity
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-ink dark:text-white sm:text-6xl">
                Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-sky-500">SpendSpark</span>, your pastel expense dashboard.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-200">
                Paste messy bank SMS alerts, let AI extract transactions, then explore spending with playful cards, charts, editable categories, and CSV export.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setDarkMode((value) => !value)} className="pastel-button bg-white text-ink dark:bg-ink dark:text-white" type="button">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {darkMode ? "Light" : "Dark"} mode
              </button>
              <button onClick={exportCsv} className="pastel-button bg-gradient-to-r from-pink-500 to-purple-500" type="button">
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total spending" value={formatCurrency(metrics.totalSpend)} helper="Across visible debit transactions" tone="bg-blush" />
          <MetricCard label="Top category" value={metrics.categoryTotals[0]?.category ?? "None yet"} helper={metrics.categoryTotals[0] ? formatCurrency(metrics.categoryTotals[0].amount) : "Paste SMS to begin"} tone="bg-skywash" />
          <MetricCard label="Transactions" value={String(transactions.length)} helper="Stored in Supabase when configured" tone="bg-minty" />
          <MetricCard label="Top merchant" value={metrics.topMerchants[0]?.merchant ?? "None yet"} helper={metrics.topMerchants[0] ? formatCurrency(metrics.topMerchants[0].amount) : "AI will detect merchants"} tone="bg-lavender" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="glass-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-ink dark:text-white">Paste bank SMS</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Multiple messages are supported. OTPs and balance alerts are ignored.</p>
              </div>
              <Wand2 className="h-8 w-8 animate-float text-pink-500" />
            </div>
            <textarea className="soft-input mt-5 min-h-64 resize-y leading-6" value={rawSms} onChange={(event) => setRawSms(event.target.value)} placeholder="Paste bank SMS alerts here..." />
            <button onClick={parseMessages} disabled={isPending} className="pastel-button mt-4 w-full bg-gradient-to-r from-ink to-purple-700 disabled:cursor-not-allowed disabled:opacity-70" type="button">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Extract & save transactions
            </button>
            {notice && <p className="mt-4 rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-100">{notice}</p>}
            {error && <p className="mt-4 rounded-2xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-800 dark:bg-rose-400/15 dark:text-rose-100">{error}</p>}
          </div>

          <div className="grid gap-6">
            <ChartCard title="Spending by category">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={metrics.categoryTotals} dataKey="amount" nameKey="category" innerRadius={62} outerRadius={96} paddingAngle={4}>
                    {metrics.categoryTotals.map((entry, index) => <Cell key={entry.category} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <ChartCard title="Monthly spending">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.monthlyTotals}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9d5ff" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="amount" radius={[18, 18, 0, 0]} fill="#9b87f5" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Daily spending trend">
            <ResponsiveContainer width="100%" height={300}>
              {metrics.trend.length > 1 ? (
                <LineChart data={metrics.trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbeafe" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="amount" stroke="#fb7185" strokeWidth={4} dot={{ r: 5 }} />
                </LineChart>
              ) : (
                <AreaChart data={metrics.monthlyTotals}>
                  <defs>
                    <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7cc7ff" stopOpacity={0.8} /><stop offset="95%" stopColor="#7cc7ff" stopOpacity={0} /></linearGradient>
                  </defs>
                  <XAxis dataKey="month" /><YAxis /><Tooltip formatter={(value) => formatCurrency(Number(value))} /><Area type="monotone" dataKey="amount" stroke="#38bdf8" fill="url(#spend)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <TransactionsTable transactions={transactions} onCategoryChange={updateCategory} />
          <TopMerchants merchants={metrics.topMerchants} />
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, helper, tone }: { label: string; value: string; helper: string; tone: string }) {
  return <article className="glass-card p-5 transition duration-200 hover:-translate-y-1 hover:shadow-soft"><div className={clsx("mb-4 h-12 w-12 rounded-2xl", tone)} /><p className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">{label}</p><h3 className="mt-2 truncate text-3xl font-black text-ink dark:text-white">{value}</h3><p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{helper}</p></article>;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <article className="glass-card p-5 sm:p-6"><h2 className="mb-4 text-2xl font-black text-ink dark:text-white">{title}</h2>{children}</article>;
}

function TransactionsTable({ transactions, onCategoryChange }: { transactions: Transaction[]; onCategoryChange: (id: string, category: ExpenseCategory) => void }) {
  return <article className="glass-card overflow-hidden p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-2xl font-black text-ink dark:text-white">Recent transactions</h2><p className="text-sm text-slate-500 dark:text-slate-300">Edit categories whenever AI needs a nudge.</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-slate-200/70 text-slate-500 dark:border-white/10 dark:text-slate-300"><th className="py-3 pr-4">Merchant</th><th className="py-3 pr-4">Amount</th><th className="py-3 pr-4">Category</th><th className="py-3 pr-4">Type</th><th className="py-3 pr-4">Date</th></tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.id} className="border-b border-slate-100 transition hover:bg-white/60 dark:border-white/5 dark:hover:bg-white/5"><td className="py-4 pr-4 font-bold text-ink dark:text-white">{transaction.merchant}</td><td className="py-4 pr-4 font-bold text-purple-700 dark:text-purple-200">{formatCurrency(transaction.amount)}</td><td className="py-4 pr-4"><select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none dark:border-white/10 dark:bg-white/10 dark:text-white" value={transaction.category} onChange={(event) => onCategoryChange(transaction.id, event.target.value as ExpenseCategory)}>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></td><td className="py-4 pr-4 capitalize text-slate-500 dark:text-slate-300">{transaction.transaction_type ?? "unknown"}</td><td className="py-4 pr-4 text-slate-500 dark:text-slate-300">{formatDate(transaction.transaction_date)}</td></tr>)}</tbody></table></div></article>;
}

function TopMerchants({ merchants }: { merchants: Array<{ merchant: string; amount: number }> }) {
  return <article className="glass-card p-5 sm:p-6"><h2 className="text-2xl font-black text-ink dark:text-white">Top merchants</h2><div className="mt-5 space-y-4">{merchants.map((merchant, index) => <div key={merchant.merchant} className="rounded-3xl bg-white/70 p-4 shadow-sm dark:bg-white/10"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lavender font-black text-purple-700">{index + 1}</span><p className="font-bold text-ink dark:text-white">{merchant.merchant}</p></div><p className="font-black text-ink dark:text-white">{formatCurrency(merchant.amount)}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-pink-400 to-sky-400" style={{ width: `${Math.max(18, (merchant.amount / Math.max(...merchants.map((item) => item.amount))) * 100)}%` }} /></div></div>)}{!merchants.length && <p className="rounded-3xl bg-white/60 p-4 text-sm text-slate-500 dark:bg-white/10 dark:text-slate-300">No merchants yet. Paste SMS alerts to light this up.</p>}</div></article>;
}
