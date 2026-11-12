CREATE TABLE public.tournament_team_payments (
 team_id uuid PRIMARY KEY REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
 paid boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE ON public.tournament_team_payments TO authenticated;
GRANT ALL ON public.tournament_team_payments TO service_role;
ALTER TABLE public.tournament_team_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_payment_manager_read ON public.tournament_team_payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.tournament_teams t WHERE t.id=team_id AND public.can_manage_tournament(t.tournament_id)));
CREATE POLICY team_payment_manager_insert ON public.tournament_team_payments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.tournament_teams t WHERE t.id=team_id AND public.can_manage_tournament(t.tournament_id)));
CREATE POLICY team_payment_manager_update ON public.tournament_team_payments FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.tournament_teams t WHERE t.id=team_id AND public.can_manage_tournament(t.tournament_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.tournament_teams t WHERE t.id=team_id AND public.can_manage_tournament(t.tournament_id)));
COMMENT ON TABLE public.tournament_team_payments IS 'Private manager-only manual payment tracking. HelloAsso teams are always considered paid from their linked item, without a manual override.';