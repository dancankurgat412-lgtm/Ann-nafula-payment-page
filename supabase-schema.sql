-- Run this once in Supabase Dashboard > SQL Editor.
create table if not exists public.payments (
  id uuid primary key,
  checkout_request_id text unique,
  merchant_request_id text,
  phone text not null,
  amount integer not null check (amount > 0),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'SUCCESS', 'FAILED')),
  result_desc text,
  receipt text unique,
  confirmed_amount numeric,
  confirmed_phone text,
  transaction_date text,
  created_at timestamptz not null default now()
);

create index if not exists payments_created_at_idx
  on public.payments (created_at desc);

-- Keep the table private: the browser must never access it directly.
alter table public.payments enable row level security;
revoke all on table public.payments from anon, authenticated;
