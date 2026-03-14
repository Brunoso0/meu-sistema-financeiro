create table if not exists public.transaction_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users (id) on delete cascade,
  is_global boolean not null default false,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  planning_group text null check (planning_group in ('needs', 'wants', 'investments')),
  sort_order integer not null default 999,
  created_at timestamptz not null default timezone('utc', now()),
  constraint transaction_categories_scope_check
    check (
      (is_global = true and user_id is null)
      or (is_global = false and user_id is not null)
    )
);

create unique index if not exists transaction_categories_user_type_name_idx
  on public.transaction_categories (user_id, type, lower(name))
  where user_id is not null;

create unique index if not exists transaction_categories_global_type_name_idx
  on public.transaction_categories (type, lower(name))
  where is_global = true;

alter table public.transaction_categories enable row level security;

drop policy if exists "Users can view own categories" on public.transaction_categories;
drop policy if exists "Users can view own and global categories" on public.transaction_categories;
create policy "Users can view own and global categories"
  on public.transaction_categories
  for select
  using (is_global = true or auth.uid() = user_id);

drop policy if exists "Users can insert own categories" on public.transaction_categories;
create policy "Users can insert own categories"
  on public.transaction_categories
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own categories" on public.transaction_categories;
create policy "Users can update own categories"
  on public.transaction_categories
  for update
  using (is_global = false and auth.uid() = user_id)
  with check (is_global = false and auth.uid() = user_id);

drop policy if exists "Users can delete own categories" on public.transaction_categories;
create policy "Users can delete own categories"
  on public.transaction_categories
  for delete
  using (is_global = false and auth.uid() = user_id);

insert into public.transaction_categories (user_id, is_global, name, type, planning_group, sort_order)
values
  (null, true, 'Salário', 'income', null, 10),
  (null, true, 'Renda extra', 'income', null, 20),
  (null, true, 'Moradia', 'expense', 'needs', 10),
  (null, true, 'Alimentação', 'expense', 'needs', 20),
  (null, true, 'Transporte', 'expense', 'needs', 30),
  (null, true, 'Saúde', 'expense', 'needs', 40),
  (null, true, 'Educação', 'expense', 'wants', 50)
on conflict (type, lower(name)) where is_global = true do nothing;