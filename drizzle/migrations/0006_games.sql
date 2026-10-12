CREATE TABLE public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE SET NULL,
  start_score integer NOT NULL,
  double_out boolean NOT NULL DEFAULT true,
  players jsonb NOT NULL,
  winner_name text NOT NULL,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.games TO authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read games" ON public.games FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));