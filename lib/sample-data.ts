import type { Transaction } from "./types";

export const sampleTransactions: Transaction[] = [
  {
    id: "demo-1",
    merchant: "DMART",
    amount: 450,
    category: "Groceries",
    raw_sms: "HDFC Bank: Rs 450 spent at DMART using Debit Card",
    transaction_date: "2026-05-03",
    transaction_type: "debit",
    created_at: "2026-05-03T10:12:00.000Z"
  },
  {
    id: "demo-2",
    merchant: "Zomato",
    amount: 630,
    category: "Food",
    raw_sms: "ICICI: INR 630 debited at Zomato on 02-May-2026",
    transaction_date: "2026-05-02",
    transaction_type: "debit",
    created_at: "2026-05-02T18:45:00.000Z"
  },
  {
    id: "demo-3",
    merchant: "Uber",
    amount: 280,
    category: "Transport",
    raw_sms: "Axis Bank: Rs.280 spent on UBER TRIP",
    transaction_date: "2026-04-29",
    transaction_type: "debit",
    created_at: "2026-04-29T08:14:00.000Z"
  },
  {
    id: "demo-4",
    merchant: "Netflix",
    amount: 499,
    category: "Entertainment",
    raw_sms: "SBI Card: Rs 499 spent at Netflix",
    transaction_date: "2026-04-25",
    transaction_type: "debit",
    created_at: "2026-04-25T12:00:00.000Z"
  },
  {
    id: "demo-5",
    merchant: "Amazon",
    amount: 2199,
    category: "Shopping",
    raw_sms: "HDFC Bank: Rs 2199 spent at AMAZON PAY INDIA",
    transaction_date: "2026-03-19",
    transaction_type: "debit",
    created_at: "2026-03-19T15:30:00.000Z"
  },
  {
    id: "demo-6",
    merchant: "Tata Power",
    amount: 1240,
    category: "Bills",
    raw_sms: "Paid Rs 1240 to Tata Power via UPI",
    transaction_date: "2026-02-12",
    transaction_type: "debit",
    created_at: "2026-02-12T09:30:00.000Z"
  }
];
