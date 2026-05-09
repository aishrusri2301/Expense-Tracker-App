create extension if not exists "pgcrypto";

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  merchant text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  category text not null check (category in (
    'Food',
    'Transport',
    'Shopping',
    'Bills',
    'Groceries',
    'Entertainment',
    'Healthcare',
    'Travel',
    'Other'
  )),
  raw_sms text not null,
  transaction_date date,
  transaction_type text not null default 'unknown' check (transaction_type in ('debit', 'credit', 'refund', 'unknown')),
  created_at timestamptz not null default now()
);

create index if not exists transactions_transaction_date_idx on public.transactions (transaction_date desc nulls last);
create index if not exists transactions_category_idx on public.transactions (category);
create index if not exists transactions_merchant_idx on public.transactions (merchant);

alter table public.transactions enable row level security;

create policy "Service role can manage transactions"
  on public.transactions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
