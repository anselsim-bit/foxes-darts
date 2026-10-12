create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "Anyone can read profiles"
on public.profiles for select to anon, authenticated using (true);

create policy "Users can insert their own profile"
on public.profiles for insert to authenticated
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'registered',
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);
grant select, insert, update, delete on public.registrations to authenticated;
grant all on public.registrations to service_role;
alter table public.registrations enable row level security;

create policy "Users can read their own registrations"
on public.registrations for select to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Users can register themselves"
on public.registrations for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can cancel their own registration"
on public.registrations for delete to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Admins can update registrations"
on public.registrations for update to authenticated
using (public.has_role(auth.uid(), 'admin'));

create table public.player_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  matches_played int not null default 0,
  wins int not null default 0,
  losses int not null default 0,
  best_score int not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.player_stats to anon;
grant select, insert, update, delete on public.player_stats to authenticated;
grant all on public.player_stats to service_role;
alter table public.player_stats enable row level security;

create policy "Anyone can read player stats"
on public.player_stats for select to anon, authenticated using (true);

create policy "Admins can manage player stats"
on public.player_stats for insert to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update player stats"
on public.player_stats for update to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete player stats"
on public.player_stats for delete to authenticated
using (public.has_role(auth.uid(), 'admin'));