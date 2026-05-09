# SpendSpark — AI Personal Expense Tracker

SpendSpark is a bright, pastel, AI-powered expense tracker built with **Next.js 15 App Router**, **React**, **Tailwind CSS**, **Recharts**, **Supabase**, and the **OpenAI API**.

Paste raw bank SMS messages, extract structured transactions, save them to Supabase, and explore spending summaries with polished charts.

## Features

- Paste one or many bank SMS alerts into a large textarea.
- OpenAI-powered extraction for merchant, amount, transaction date, transaction type, and category.
- Ignores OTP, login, balance-only, promotional, failed, and declined alerts.
- Supabase-backed `transactions` table with raw SMS stored for debugging.
- Playful responsive dashboard with soft pastel cards and shadows.
- Total spending, category breakdown, monthly spending, daily trend, recent transactions, and top merchants.
- Recharts pie, bar, line, and area charts.
- Manual category editing.
- Dark mode toggle.
- CSV export.
- Demo data and local heuristic parsing when API keys are not configured.

## Tech Stack

- Next.js 15 with App Router
- React 19
- Tailwind CSS
- Recharts
- Supabase
- OpenAI Responses API with structured JSON output

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Copy the sample file:

```bash
cp .env.example .env.local
```

Fill in your keys:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4.1-mini
```

Notes:

- `OPENAI_API_KEY` enables AI extraction. Without it, the app uses a small local demo parser so beginners can still try the UI.
- `SUPABASE_SERVICE_ROLE_KEY` is recommended for server-side inserts and category updates. Keep it secret and only use it on the server.
- Without Supabase variables, parsed transactions are shown in the browser for the current session but are not persisted.

## 3. Create the Supabase table

Open the Supabase SQL editor and run:

```sql
-- See supabase/schema.sql for the full schema.
```

Or copy the contents of [`supabase/schema.sql`](supabase/schema.sql) into the SQL editor.

The table stores:

- `id`
- `merchant`
- `amount`
- `category`
- `raw_sms`
- `transaction_date`
- `transaction_type`
- `created_at`

## 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Try this sample SMS:

```text
HDFC Bank: Rs 450 spent at DMART using Debit Card
```

Expected extraction:

```json
{
  "merchant": "DMART",
  "amount": 450,
  "category": "Groceries"
}
```

## 5. Deploy to Vercel

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Add the same environment variables from `.env.example` in Vercel Project Settings.
4. Deploy.

The app is serverless-friendly: API routes call OpenAI and Supabase from the server, while the dashboard stays responsive on the client.

## Folder Structure

```text
app/
  api/
    parse/route.ts          # OpenAI extraction and Supabase insert
    transactions/route.ts   # Fetch and category update endpoints
  globals.css               # Tailwind styles and pastel UI primitives
  layout.tsx
  page.tsx
components/
  dashboard.tsx             # Main interactive dashboard
lib/
  analytics.ts              # Chart metrics and formatting helpers
  sample-data.ts            # Demo data
  supabase.ts               # Supabase server client helpers
  types.ts                  # Shared app types and category enum
supabase/
  schema.sql                # Database schema
```

## AI Parsing Behavior

The parser asks OpenAI to return strict JSON with this shape:

```json
{
  "transactions": [
    {
      "merchant": "DMART",
      "amount": 450,
      "category": "Groceries",
      "raw_sms": "HDFC Bank: Rs 450 spent at DMART using Debit Card",
      "transaction_date": null,
      "transaction_type": "debit",
      "ignored": false,
      "ignore_reason": null
    }
  ]
}
```

Allowed categories:

- Food
- Transport
- Shopping
- Bills
- Groceries
- Entertainment
- Healthcare
- Travel
- Other
