ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS price_cents integer CHECK (price_cents IS NULL OR (price_cents >= 0 AND price_cents <= 100000));
ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS organizations_status_check;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_status_check CHECK (status IN ('pending','active','suspended','deleted'));

CREATE OR REPLACE FUNCTION public.delete_organization(_organization_id uuid, _confirm_name text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.organizations;
BEGIN
  SELECT * INTO o FROM public.organizations WHERE id=_organization_id FOR UPDATE;
  IF o.id IS NULL OR o.status='deleted' THEN RAISE EXCEPTION 'Not found'; END IF;
  IF o.slug='foxes-darts' THEN RAISE EXCEPTION 'Central organization is protected'; END IF;
  IF NOT (public.is_platform_admin() OR EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=o.id AND user_id=auth.uid() AND role='ORGANIZATION_OWNER')) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF lower(trim(_confirm_name)) <> lower(trim(o.name)) THEN RAISE EXCEPTION 'Confirmation mismatch'; END IF;
  UPDATE public.organizations SET status='deleted', visibility='private', updated_at=now() WHERE id=o.id;
  INSERT INTO public.organization_audit_events(organization_id,actor_id,action,details) VALUES(o.id,auth.uid(),'organization.deleted','{}'::jsonb);
END $$;
GRANT EXECUTE ON FUNCTION public.delete_organization(uuid,text) TO authenticated;