REVOKE ALL ON public.tournament_team_payments FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public.tournament_team_payments TO authenticated;
GRANT ALL ON public.tournament_team_payments TO service_role;