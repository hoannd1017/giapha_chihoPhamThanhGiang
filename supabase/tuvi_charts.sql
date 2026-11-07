-- TuVi charts storage (one chart per user)
create table if not exists public.tuvi_charts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.tuvi_charts enable row level security;

-- Users can read their own chart
create policy "tuvi_charts_select_own"
  on public.tuvi_charts for select
  using (auth.uid() = user_id);

-- Admins can read all charts
create policy "tuvi_charts_select_admin"
  on public.tuvi_charts for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Users can insert their own chart
create policy "tuvi_charts_insert_own"
  on public.tuvi_charts for insert
  with check (auth.uid() = user_id);

-- Users can update their own chart
create policy "tuvi_charts_update_own"
  on public.tuvi_charts for update
  using (auth.uid() = user_id);

-- Admins can delete any chart
create policy "tuvi_charts_delete_admin"
  on public.tuvi_charts for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
