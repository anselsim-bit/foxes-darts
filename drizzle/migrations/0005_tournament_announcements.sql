ALTER TABLE public.profiles
  ADD COLUMN tournament_announcements boolean NOT NULL DEFAULT true,
  ADD COLUMN tournaments_seen_at timestamptz NOT NULL DEFAULT now();