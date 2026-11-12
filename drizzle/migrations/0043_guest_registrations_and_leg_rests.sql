ALTER TABLE public.tournament_matches ADD COLUMN IF NOT EXISTS leg_rests jsonb, ADD COLUMN IF NOT EXISTS live_leg_rests jsonb;

CREATE TABLE public.tournament_guest_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  first_name text NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 60),
  last_name text NOT NULL CHECK (char_length(last_name) BETWEEN 1 AND 60),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 6 AND 30),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, email)
);
GRANT SELECT ON public.tournament_guest_registrations TO authenticated;
GRANT ALL ON public.tournament_guest_registrations TO service_role;
ALTER TABLE public.tournament_guest_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY guest_registrations_manager_read ON public.tournament_guest_registrations FOR SELECT TO authenticated USING (public.can_manage_tournament(tournament_id));