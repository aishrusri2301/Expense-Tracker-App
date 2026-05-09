"use client";

import { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Download, Loader2, Moon, Sparkles, Sun, Wand2 } from "lucide-react";
import { buildMetrics, formatCurrency, formatDate } from "@/lib/analytics";
import { CATEGORIES, type ExpenseCategory, type Transaction } from "@/lib/types";

const CHART_COLORS = ["#fb8bbd", "#7cc7ff", "#70df9d", "#b69cff", "#ffd166", "#ff9f8f", "#83e6d6", "#a5b4fc", "#d1d5db"];

const SAMPLE_SMS = `HDFC Bank: Rs 450 spent at DMART using Debit Card

ICICI Bank: INR 630 debited at Zomato on 02-May-2026

Axis Bank: Rs.280 spent on UBER TRIP

Your OTP is 440922. Do not share it with anyone.`;

const SMS_PLACEHOLDER = `Paste your bank SMS messages here, one per line or separated by blank lines.

Examples:
HDFC Bank: Rs 450 spent at DMART using Debit Card
ICICI Bank: INR 630 debited at Zomato on 02-May-2026
SBI Card: Rs 499 spent at Netflix

OTP and balance alerts are ignored automatically.`;

type DashboardProps = {
  initialTransactions: Transaction[];
  usingSampleData: boolean;
};

type ParsePreview = {
  transactions: Transaction[];
  ignoredCount: number;
  persisted: boolean;
  mode: "openai" | "local-demo";
};

export function Dashboard({ initialTransactions, usingSampleData }: DashboardProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [rawSms, setRawSms] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ParsePreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(
    usingSampleData
      ? "Paste bank SMS messages to generate real transactions."
      : null
  );

  const [darkMode, setDarkMode] = useState(false);
  const [isPending, startTransition] = useTransition();

  const metrics = useMemo(() => buildMetrics(transactions), [transactions]);

  async function parseMessages() {
    setError(null);
    setNotice(null);
    setParsedPreview(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawSms })
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to parse SMS messages.");
        }

        const parsedTransactions = (payload.transactions ?? []) as Transaction[];
        const ignoredCount = payload.ignored?.length ?? 0;

        if (parsedTransactions.length) {
          setTransactions((current) => [
            ...parsedTransactions,
            ...current.filter((transaction) => !transaction.id.startsWith("demo-"))
          ]);
        }

        setParsedPreview({
          transactions: parsedTransactions,
          ignoredCount,
          persisted: Boolean(payload.persisted),
          mode: payload.mode === "openai" ? "openai" : "local-demo"
        });

        setNotice(
          `${parsedTransactions.length} transaction${
            parsedTransactions.length === 1 ? "" : "s"
          } parsed successfully.`
        );
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Something went wrong."
        );
      }
    });
  }

  async function updateCategory(id: string, category: ExpenseCategory) {
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === id
          ? { ...transaction, category }
          : transaction
      )
    );

    if (id.startsWith("demo-") || id.startsWith("local-")) return;

    await fetch("/api/transactions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, category })
    });
  }

  function exportCsv() {
    const header = ["Merchant", "Amount", "Category"];

    const rows = transactions.map((transaction) => [
      transaction.merchant,
      transaction.amount,
      transaction.category
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], {
        type: "text/csv;charset=utf-8"
      })
    );

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "transactions.csv";
    anchor.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main
      className={clsx(
        "min-h-screen px-4 py-6 transition-colors duration-300 sm:px-6 lg:px-8",
        darkMode && "dark bg-[#111124]"
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6">

        <header className="glass-card overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-purple-700 shadow-sm dark:bg-white/10 dark:text-purple-100">
                <Sparkles className="h-4 w-4" />
                AI-powered money clarity
              </div>

              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-ink dark:text-white sm:text-6xl">
                Paste bank SMS. Get instant expense insights.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-200">
                Paste your bank alerts below and instantly generate categorized expense analytics.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setDarkMode((value) => !value)}
                className="pastel-button bg-white text-ink dark:bg-ink dark:text-white"
                type="button"
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <button
                onClick={exportCsv}
                className="pastel-button bg-gradient-to-r from-pink-500 to-purple-500"
                type="button"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </header>

        <section className="glass-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black text-ink dark:text-white">
                Paste Bank SMS
              </h2>

              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Paste one or multiple SMS messages below.
              </p>
            </div>

            <button
              onClick={() => setRawSms(SAMPLE_SMS)}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-purple-700 shadow-sm"
            >
              Use sample SMS
            </button>
          </div>

          <textarea
            className="soft-input min-h-[20rem] resize-y"
            value={rawSms}
            onChange={(event) => setRawSms(event.target.value)}
            placeholder={SMS_PLACEHOLDER}
          />

          <button
            onClick={parseMessages}
            disabled={isPending}
            className="pastel-button mt-4 w-full bg-gradient-to-r from-pink-500 via-purple-500 to-sky-500 py-4 text-base"
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}

            {isPending ? "Parsing..." : "Parse Transactions"}
          </button>

          {notice && (
            <p className="mt-4 rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-800">
              {notice}
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-2xl bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-800">
              {error}
            </p>
          )}
        </section>

      </div>
    </main>
  );
}