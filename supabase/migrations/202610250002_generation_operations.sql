create table if not exists public.generation_operations (
  id uuid primary key,
  operation jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.generation_operations enable row level security;
revoke all on public.generation_operations from anon, authenticated;
grant all on public.generation_operations to service_role;
create index if not exists generation_operations_created_at_idx on public.generation_operations (created_at desc);
