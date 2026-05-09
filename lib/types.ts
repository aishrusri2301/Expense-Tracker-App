export const CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Groceries",
  "Entertainment",
  "Healthcare",
  "Travel",
  "Other"
] as const;

export type ExpenseCategory = (typeof CATEGORIES)[number];

export type TransactionType = "debit" | "credit" | "refund" | "unknown";

export type Transaction = {
  id: string;
  merchant: string;
  amount: number;
  category: ExpenseCategory;
  raw_sms: string;
  transaction_date: string | null;
  transaction_type?: TransactionType;
  created_at: string;
};

export type ParsedTransaction = Omit<Transaction, "id" | "created_at"> & {
  ignored?: boolean;
  ignore_reason?: string | null;
};

export type DashboardMetrics = {
  totalSpend: number;
  categoryTotals: Array<{ category: ExpenseCategory; amount: number }>;
  monthlyTotals: Array<{ month: string; amount: number }>;
  trend: Array<{ date: string; amount: number }>;
  topMerchants: Array<{ merchant: string; amount: number }>;
};
