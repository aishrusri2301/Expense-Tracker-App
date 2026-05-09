import { NextResponse } from "next/server";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { CATEGORIES, type ExpenseCategory, type ParsedTransaction, type Transaction } from "@/lib/types";

const transactionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    transactions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          merchant: { type: "string" },
          amount: { type: "number" },
          category: { type: "string", enum: CATEGORIES },
          raw_sms: { type: "string" },
          transaction_date: { type: ["string", "null"], description: "ISO date YYYY-MM-DD if available, otherwise null" },
          transaction_type: { type: "string", enum: ["debit", "credit", "refund", "unknown"] },
          ignored: { type: "boolean" },
          ignore_reason: { type: ["string", "null"] }
        },
        required: ["merchant", "amount", "category", "raw_sms", "transaction_date", "transaction_type", "ignored", "ignore_reason"]
      }
    }
  },
  required: ["transactions"]
};

export async function POST(request: Request) {
  try {
    const { rawSms } = (await request.json()) as { rawSms?: string };

    if (!rawSms?.trim()) {
      return NextResponse.json({ error: "Paste at least one bank SMS message." }, { status: 400 });
    }

    const parsed = process.env.OPENAI_API_KEY ? await parseWithOpenAI(rawSms) : parseLocally(rawSms);
    const transactionsToStore = parsed.filter((transaction) => !transaction.ignored && transaction.amount > 0);
    let savedTransactions: Transaction[] = [];

    if (transactionsToStore.length && isSupabaseConfigured) {
      const supabase = getSupabaseServerClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("transactions")
          .insert(
            transactionsToStore.map((transaction) => ({
              merchant: transaction.merchant,
              amount: transaction.amount,
              category: CATEGORIES.includes(transaction.category) ? transaction.category : "Other",
              raw_sms: transaction.raw_sms,
              transaction_date: transaction.transaction_date,
              transaction_type: transaction.transaction_type
            }))
          )
          .select("id, merchant, amount, category, raw_sms, transaction_date, transaction_type, created_at");

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        savedTransactions = (data ?? []) as Transaction[];
      }
    } else {
      savedTransactions = transactionsToStore.map((transaction, index) => ({
        id: `local-${Date.now()}-${index}`,
        merchant: transaction.merchant,
        amount: transaction.amount,
        category: transaction.category,
        raw_sms: transaction.raw_sms,
        transaction_date: transaction.transaction_date,
        transaction_type: transaction.transaction_type,
        created_at: new Date().toISOString()
      }));
    }

    return NextResponse.json({
      transactions: savedTransactions,
      ignored: parsed.filter((transaction) => transaction.ignored),
      mode: process.env.OPENAI_API_KEY ? "openai" : "local-demo",
      persisted: isSupabaseConfigured
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "We could not parse those messages. Try again with bank debit SMS text." }, { status: 500 });
  }
}

async function parseWithOpenAI(rawSms: string): Promise<ParsedTransaction[]> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You extract personal finance transactions from raw bank SMS text. Return only real money transactions. Ignore OTPs, login alerts, balance-only alerts, promotional messages, and failed transactions. Categorize into the provided enum. Dates must be YYYY-MM-DD when present."
        },
        {
          role: "user",
          content: `Parse these bank SMS messages. Multiple messages may be pasted together:\n\n${rawSms}`
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "expense_transactions",
          schema: transactionSchema,
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed: ${details}`);
  }

  const result = await response.json();
  const outputText = result.output_text ?? result.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? []).map((content: { text?: string }) => content.text).join("");
  const parsed = JSON.parse(outputText || "{\"transactions\":[]}") as { transactions: ParsedTransaction[] };

  return parsed.transactions.map(cleanTransaction);
}

function parseLocally(rawSms: string): ParsedTransaction[] {
  return splitMessages(rawSms).map((message) => {
    const lower = message.toLowerCase();
    if (/otp|one time password|available balance|balance is|statement|login|failed|declined/.test(lower)) {
      return {
        merchant: "Ignored message",
        amount: 0,
        category: "Other",
        raw_sms: message,
        transaction_date: null,
        transaction_type: "unknown",
        ignored: true,
        ignore_reason: "OTP, balance, login, failed, or non-transaction alert"
      };
    }

    const amountMatch = message.match(/(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.\d{1,2})?)/i) ?? message.match(/([0-9,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹)/i);
    const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : 0;
    const merchantMatch = message.match(/(?:at|to|in|on)\s+([A-Z0-9 &._-]{3,})(?:\s+using|\s+via|\s+on|\s+for|\.|$)/i);
    const merchant = merchantMatch?.[1]?.trim().replace(/\s{2,}/g, " ") ?? "Unknown merchant";
    const transaction_type = /credited|received|refund/i.test(message) ? "credit" : /spent|debited|paid|purchase|withdrawn/i.test(message) ? "debit" : "unknown";

    return cleanTransaction({
      merchant,
      amount,
      category: guessCategory(merchant, message),
      raw_sms: message,
      transaction_date: extractDate(message),
      transaction_type,
      ignored: amount <= 0,
      ignore_reason: amount <= 0 ? "No transaction amount detected" : null
    });
  });
}

function splitMessages(rawSms: string) {
  return rawSms
    .split(/\n{2,}|(?=(?:HDFC|ICICI|SBI|Axis|Kotak|YES|IDFC|Bank|Card)[:\s])/gi)
    .map((message) => message.trim())
    .filter(Boolean);
}

function guessCategory(merchant: string, raw: string): ExpenseCategory {
  const text = `${merchant} ${raw}`.toLowerCase();
  if (/zomato|swiggy|restaurant|cafe|pizza|food|starbucks|dominos/.test(text)) return "Food";
  if (/uber|ola|metro|fuel|petrol|diesel|rapido|taxi|train/.test(text)) return "Transport";
  if (/amazon|flipkart|myntra|store|mall|shopping/.test(text)) return "Shopping";
  if (/electric|power|airtel|jio|vi |vodafone|bill|broadband|rent/.test(text)) return "Bills";
  if (/dmart|grocery|bigbasket|blinkit|zepto|supermarket/.test(text)) return "Groceries";
  if (/netflix|spotify|movie|pvr|bookmyshow|gaming/.test(text)) return "Entertainment";
  if (/hospital|pharmacy|apollo|medical|doctor|clinic/.test(text)) return "Healthcare";
  if (/hotel|flight|airbnb|makemytrip|goibibo|travel/.test(text)) return "Travel";
  return "Other";
}

function extractDate(message: string) {
  const iso = message.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  const indian = message.match(/\b(\d{1,2})[-/ ](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/ ]?(20\d{2})?\b/i);
  if (!indian) return null;

  const [, day, monthName, year] = indian;
  const date = new Date(`${day} ${monthName} ${year ?? new Date().getFullYear()}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function cleanTransaction(transaction: ParsedTransaction): ParsedTransaction {
  const category = CATEGORIES.includes(transaction.category) ? transaction.category : "Other";
  return {
    ...transaction,
    merchant: transaction.merchant?.trim() || "Unknown merchant",
    amount: Number(transaction.amount) || 0,
    category,
    raw_sms: transaction.raw_sms?.trim() || "",
    transaction_date: transaction.transaction_date || null,
    transaction_type: transaction.transaction_type ?? "unknown"
  };
}
