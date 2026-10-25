-- Personal, shared workspace. Only the server service-role key may access data.
create table if not exists public.companies_core (
  id uuid primary key,
  core jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.site_versions (
  id uuid primary key,
  core_id uuid not null references public.companies_core(id),
  version jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists site_versions_core_idx on public.site_versions(core_id, created_at);
create table if not exists public.company_modules (
  id uuid primary key,
  core_id uuid not null references public.companies_core(id),
  result jsonb not null
);
alter table public.companies_core enable row level security;
alter table public.site_versions enable row level security;
alter table public.company_modules enable row level security;
revoke all on public.companies_core, public.site_versions, public.company_modules from anon, authenticated;
grant all on public.companies_core, public.site_versions, public.company_modules to service_role;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sites', 'sites', false, 6291456, array['application/json'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
