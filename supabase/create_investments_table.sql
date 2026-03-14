-- Create investments table for per-user investment portfolio management
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  institution text,
  annual_rate numeric(7, 4) not null default 0,
  goal_amount numeric(14, 2) not null default 0,
  current_amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists investments_user_id_idx on public.investments(user_id);
create index if not exists investments_created_at_idx on public.investments(created_at desc);

alter table public.investments enable row level security;

drop policy if exists "Users can view own investments" on public.investments;
create policy "Users can view own investments"
  on public.investments
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own investments" on public.investments;
create policy "Users can insert own investments"
  on public.investments
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own investments" on public.investments;
create policy "Users can update own investments"
  on public.investments
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own investments" on public.investments;
create policy "Users can delete own investments"
  on public.investments
  for delete
  using (auth.uid() = user_id);
