ALTER POLICY "admin manages access codes" ON public.tournament_access_codes USING(false) WITH CHECK(false);
REVOKE ALL ON public.tournament_access_codes FROM anon,authenticated;
COMMENT ON TABLE public.tournament_access_codes IS 'DEPRECATED: historical codes are service-only archives; active access exclusively uses tournament_settings_codes and tournament_code_claims.';
CREATE FUNCTION public.link_registered_organization_player() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO public.organization_players(organization_id,user_id) SELECT organization_id,NEW.user_id FROM public.tournaments WHERE id=NEW.tournament_id ON CONFLICT DO NOTHING; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.link_registered_organization_player() FROM PUBLIC;
CREATE TRIGGER registrations_organization_player AFTER INSERT ON public.registrations FOR EACH ROW EXECUTE FUNCTION public.link_registered_organization_player();
REVOKE INSERT ON public.profiles FROM authenticated;
GRANT INSERT(id,display_name,tournament_announcements,tournaments_seen_at,first_name,last_name,avatar_path) ON public.profiles TO authenticated;