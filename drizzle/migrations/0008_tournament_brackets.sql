ALTER TABLE public.tournaments ADD COLUMN team_size integer NOT NULL DEFAULT 1;
ALTER TABLE public.tournaments ADD COLUMN pool_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.tournaments ADD COLUMN status text NOT NULL DEFAULT 'open';
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_status_check CHECK (status IN ('open','started','finished'));

CREATE TABLE public.tournament_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name text NOT NULL,
  captain_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, captain_id)
);
GRANT SELECT ON public.tournament_teams TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tournament_teams TO authenticated;
GRANT ALL ON public.tournament_teams TO service_role;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads teams" ON public.tournament_teams FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Captain or admin inserts team" ON public.tournament_teams FOR INSERT TO authenticated WITH CHECK (captain_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Captain or admin deletes team" ON public.tournament_teams FOR DELETE TO authenticated USING (captain_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin updates team" ON public.tournament_teams FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.enforce_team_capacity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; n integer;
BEGIN
  SELECT max_participants, status INTO t FROM public.tournaments WHERE id = NEW.tournament_id FOR UPDATE;
  IF t.status <> 'open' THEN RAISE EXCEPTION 'TOURNAMENT_STARTED'; END IF;
  IF t.max_participants IS NOT NULL THEN
    SELECT count(*) INTO n FROM public.tournament_teams WHERE tournament_id = NEW.tournament_id;
    IF n >= t.max_participants THEN RAISE EXCEPTION 'TOURNAMENT_FULL'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tournament_teams_capacity BEFORE INSERT ON public.tournament_teams FOR EACH ROW EXECUTE FUNCTION public.enforce_team_capacity();

CREATE TABLE public.tournament_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('pool','bracket')),
  pool_index integer,
  round integer NOT NULL DEFAULT 1,
  position integer NOT NULL DEFAULT 0,
  team_a uuid REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  team_b uuid REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  score_a integer,
  score_b integer,
  winner uuid REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tournament_matches TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tournament_matches TO authenticated;
GRANT ALL ON public.tournament_matches TO service_role;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads matches" ON public.tournament_matches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin inserts matches" ON public.tournament_matches FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin updates matches" ON public.tournament_matches FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin deletes matches" ON public.tournament_matches FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX ON public.tournament_matches (tournament_id);
CREATE INDEX ON public.tournament_teams (tournament_id);