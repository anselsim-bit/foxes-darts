ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS tournament_limit integer CHECK (tournament_limit IS NULL OR tournament_limit >= 0);
COMMENT ON COLUMN public.organizations.tournament_limit IS 'Max tournaments the organization may create; NULL = unlimited. Set by platform admins only.';

CREATE OR REPLACE FUNCTION public.organization_onboarding_open() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.platform_release_flags WHERE name='organization_onboarding' AND enabled)
      OR public.is_platform_admin()
      OR EXISTS(SELECT 1 FROM public.organization_onboarding_allowlist WHERE user_id=auth.uid())
$$;
GRANT EXECUTE ON FUNCTION public.organization_onboarding_open() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_organization_onboarding(_enabled boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  INSERT INTO public.platform_release_flags(name,enabled) VALUES('organization_onboarding',_enabled)
    ON CONFLICT(name) DO UPDATE SET enabled=EXCLUDED.enabled;
  INSERT INTO public.organization_audit_events(actor_id,action,details) VALUES(auth.uid(), CASE WHEN _enabled THEN 'organization_onboarding_opened' ELSE 'organization_onboarding_closed' END, '{}'::jsonb);
END $$;
GRANT EXECUTE ON FUNCTION public.set_organization_onboarding(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_organization_tournament_limit(_organization_id uuid, _limit integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _limit IS NOT NULL AND _limit < 0 THEN RAISE EXCEPTION 'Invalid limit'; END IF;
  UPDATE public.organizations SET tournament_limit=_limit WHERE id=_organization_id;
  INSERT INTO public.organization_audit_events(organization_id,actor_id,action,details) VALUES(_organization_id,auth.uid(),'tournament_limit_changed',jsonb_build_object('limit',_limit));
END $$;
GRANT EXECUTE ON FUNCTION public.set_organization_tournament_limit(uuid,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_organization_tournament_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _limit integer;
BEGIN
  IF NEW.organization_id IS NULL THEN RETURN NEW; END IF;
  SELECT tournament_limit INTO _limit FROM public.organizations WHERE id=NEW.organization_id FOR UPDATE;
  IF _limit IS NOT NULL AND (SELECT count(*) FROM public.tournaments WHERE organization_id=NEW.organization_id) >= _limit THEN
    RAISE EXCEPTION 'Limite atteinte : cette organisation peut créer % tournoi(s) au maximum.', _limit;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS organization_tournament_limit ON public.tournaments;
CREATE TRIGGER organization_tournament_limit BEFORE INSERT ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.enforce_organization_tournament_limit();