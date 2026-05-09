import type { DashboardMetrics, ExpenseCategory, Transaction } from "./types";
import { CATEGORIES } from "./types";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

export function formatDate(date: string | null) {
  if (!date) return "No date";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

export function buildMetrics(transactions: Transaction[]): DashboardMetrics {
  const expenses = transactions.filter((transaction) => transaction.transaction_type !== "credit");
  const categoryMap = new Map<ExpenseCategory, number>(CATEGORIES.map((category) => [category, 0]));
  const monthlyMap = new Map<string, number>();
  const trendMap = new Map<string, number>();
  const merchantMap = new Map<string, number>();

  for (const transaction of expenses) {
    categoryMap.set(transaction.category, (categoryMap.get(transaction.category) ?? 0) + transaction.amount);

    const sourceDate = transaction.transaction_date ?? transaction.created_at;
    const date = new Date(sourceDate);
    const month = date.toLocaleDateString("en", { month: "short", year: "2-digit" });
    const day = date.toISOString().slice(0, 10);

    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + transaction.amount);
    trendMap.set(day, (trendMap.get(day) ?? 0) + transaction.amount);
    merchantMap.set(transaction.merchant, (merchantMap.get(transaction.merchant) ?? 0) + transaction.amount);
  }

  return {
    totalSpend: expenses.reduce((total, transaction) => total + transaction.amount, 0),
    categoryTotals: [...categoryMap.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount),
    monthlyTotals: [...monthlyMap.entries()].map(([month, amount]) => ({ month, amount })).reverse(),
    trend: [...trendMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount })),
    topMerchants: [...merchantMap.entries()]
      .map(([merchant, amount]) => ({ merchant, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  };
}
