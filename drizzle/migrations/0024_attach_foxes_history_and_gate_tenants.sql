ALTER TABLE public.profiles ADD COLUMN first_name text;
ALTER TABLE public.profiles ADD COLUMN last_name text;
ALTER TABLE public.profiles ADD COLUMN avatar_path text;

ALTER TABLE public.tournaments ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.tournaments ADD COLUMN created_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.photos ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.standings ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.highlights ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
UPDATE public.tournaments SET organization_id = (SELECT id FROM public.organizations WHERE slug='foxes-darts') WHERE organization_id IS NULL;
UPDATE public.photos p SET organization_id = COALESCE((SELECT t.organization_id FROM public.tournaments t WHERE t.id=p.tournament_id),(SELECT id FROM public.organizations WHERE slug='foxes-darts')) WHERE p.organization_id IS NULL;
UPDATE public.standings SET organization_id = (SELECT id FROM public.organizations WHERE slug='foxes-darts') WHERE organization_id IS NULL;
UPDATE public.highlights SET organization_id = (SELECT id FROM public.organizations WHERE slug='foxes-darts') WHERE organization_id IS NULL;
CREATE INDEX tournaments_organization_date_idx ON public.tournaments(organization_id,event_date DESC);
CREATE INDEX photos_organization_idx ON public.photos(organization_id,created_at DESC);
CREATE INDEX standings_organization_idx ON public.standings(organization_id,season,rank);
CREATE INDEX highlights_organization_idx ON public.highlights(organization_id,event_date DESC);

CREATE FUNCTION public.enforce_legacy_organization_gate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE central_id uuid;
BEGIN
 SELECT id INTO central_id FROM public.organizations WHERE slug='foxes-darts' AND status='active';
 IF central_id IS NULL THEN RAISE EXCEPTION 'Central organization unavailable'; END IF;
 IF TG_OP='INSERT' AND NEW.organization_id IS NULL THEN NEW.organization_id := central_id; END IF;
 IF NEW.organization_id IS DISTINCT FROM central_id THEN RAISE EXCEPTION 'Multi-organization onboarding is not enabled'; END IF;
 IF TG_OP='UPDATE' AND NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN RAISE EXCEPTION 'Organization reassignment is forbidden'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_legacy_organization_gate() FROM PUBLIC;
CREATE TRIGGER tournaments_legacy_organization_gate BEFORE INSERT OR UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.enforce_legacy_organization_gate();
CREATE TRIGGER photos_legacy_organization_gate BEFORE INSERT OR UPDATE ON public.photos FOR EACH ROW EXECUTE FUNCTION public.enforce_legacy_organization_gate();
CREATE TRIGGER standings_legacy_organization_gate BEFORE INSERT OR UPDATE ON public.standings FOR EACH ROW EXECUTE FUNCTION public.enforce_legacy_organization_gate();
CREATE TRIGGER highlights_legacy_organization_gate BEFORE INSERT OR UPDATE ON public.highlights FOR EACH ROW EXECUTE FUNCTION public.enforce_legacy_organization_gate();

CREATE FUNCTION public.enforce_organization_onboarding_gate() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN RAISE EXCEPTION 'Organization creation is not enabled during migration'; END IF;
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.slug IS DISTINCT FROM OLD.slug OR NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Organization lifecycle changes are not enabled during migration'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_organization_onboarding_gate() FROM PUBLIC;
CREATE TRIGGER organizations_onboarding_gate BEFORE INSERT OR UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.enforce_organization_onboarding_gate();

ALTER TABLE public.tournament_teams ADD CONSTRAINT tournament_teams_tournament_id_id_key UNIQUE(tournament_id,id);
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_id_organization_key UNIQUE(id,organization_id);
ALTER TABLE public.photos ADD CONSTRAINT photos_tournament_organization_fk FOREIGN KEY(tournament_id,organization_id) REFERENCES public.tournaments(id,organization_id) ON DELETE CASCADE;
ALTER TABLE public.tournament_matches ADD CONSTRAINT matches_team_a_same_tournament_fk FOREIGN KEY(tournament_id,team_a) REFERENCES public.tournament_teams(tournament_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.tournament_matches ADD CONSTRAINT matches_team_b_same_tournament_fk FOREIGN KEY(tournament_id,team_b) REFERENCES public.tournament_teams(tournament_id,id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.tournament_matches ADD CONSTRAINT matches_winner_same_tournament_fk FOREIGN KEY(tournament_id,winner) REFERENCES public.tournament_teams(tournament_id,id) DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX tournament_matches_team_a_idx ON public.tournament_matches(team_a);
CREATE INDEX tournament_matches_team_b_idx ON public.tournament_matches(team_b);
CREATE INDEX tournament_matches_winner_idx ON public.tournament_matches(winner);

CREATE FUNCTION public.enforce_manager_assignment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.tournaments t JOIN public.organization_members m ON m.organization_id=t.organization_id WHERE t.id=NEW.tournament_id AND m.user_id=NEW.user_id AND m.role='TOURNAMENT_MANAGER') THEN RAISE EXCEPTION 'Manager must belong to the tournament organization'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_manager_assignment() FROM PUBLIC;
CREATE TRIGGER manager_assignment_membership BEFORE INSERT OR UPDATE ON public.tournament_manager_assignments FOR EACH ROW EXECUTE FUNCTION public.enforce_manager_assignment();

CREATE FUNCTION public.can_manage_tournament(_tournament_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.tournaments t JOIN public.organizations o ON o.id=t.organization_id WHERE t.id=_tournament_id AND o.status='active' AND
 (public.can_manage_organization(t.organization_id) OR EXISTS(SELECT 1 FROM public.organization_members m JOIN public.tournament_manager_assignments a ON a.user_id=m.user_id WHERE m.organization_id=t.organization_id AND m.user_id=auth.uid() AND m.role='TOURNAMENT_MANAGER' AND a.tournament_id=t.id)))
$$;
REVOKE ALL ON FUNCTION public.can_manage_tournament(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_tournament(uuid) TO authenticated,service_role;
COMMENT ON COLUMN public.games.tournament_id IS 'Legacy optional tournament link. NULL free-play games remain global; do not infer an organization or member identity for historical free-play.';
COMMENT ON TABLE public.user_roles IS 'Legacy central-site roles retained during gated migration. Not a source of platform SUPER_ADMIN or authorization for a future second organization.';