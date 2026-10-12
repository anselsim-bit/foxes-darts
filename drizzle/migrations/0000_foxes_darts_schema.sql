create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can read their own roles"
on public.user_roles for select to authenticated
using (auth.uid() = user_id);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  location text,
  description text,
  helloasso_url text,
  image_url text,
  created_at timestamptz not null default now()
);
grant select on public.tournaments to anon;
grant select, insert, update, delete on public.tournaments to authenticated;
grant all on public.tournaments to service_role;
alter table public.tournaments enable row level security;

create policy "Anyone can read tournaments"
on public.tournaments for select to anon, authenticated using (true);

create policy "Admins can insert tournaments"
on public.tournaments for insert to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update tournaments"
on public.tournaments for update to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete tournaments"
on public.tournaments for delete to authenticated
using (public.has_role(auth.uid(), 'admin'));

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now()
);
grant select on public.photos to anon;
grant select, insert, update, delete on public.photos to authenticated;
grant all on public.photos to service_role;
alter table public.photos enable row level security;

create policy "Anyone can read photos"
on public.photos for select to anon, authenticated using (true);

create policy "Admins can insert photos"
on public.photos for insert to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update photos"
on public.photos for update to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete photos"
on public.photos for delete to authenticated
using (public.has_role(auth.uid(), 'admin'));

create table public.standings (
  id uuid primary key default gen_random_uuid(),
  season text not null default '2026',
  rank int not null,
  player_name text not null,
  played int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  points int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.standings to anon;
grant select, insert, update, delete on public.standings to authenticated;
grant all on public.standings to service_role;
alter table public.standings enable row level security;

create policy "Anyone can read standings"
on public.standings for select to anon, authenticated using (true);

create policy "Admins can insert standings"
on public.standings for insert to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update standings"
on public.standings for update to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete standings"
on public.standings for delete to authenticated
using (public.has_role(auth.uid(), 'admin'));

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  media_url text,
  event_date date,
  created_at timestamptz not null default now()
);
grant select on public.highlights to anon;
grant select, insert, update, delete on public.highlights to authenticated;
grant all on public.highlights to service_role;
alter table public.highlights enable row level security;

create policy "Anyone can read highlights"
on public.highlights for select to anon, authenticated using (true);

create policy "Admins can insert highlights"
on public.highlights for insert to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update highlights"
on public.highlights for update to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete highlights"
on public.highlights for delete to authenticated
using (public.has_role(auth.uid(), 'admin'));