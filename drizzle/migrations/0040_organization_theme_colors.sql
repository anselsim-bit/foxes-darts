ALTER TABLE public.organization_settings ADD COLUMN IF NOT EXISTS theme_colors jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.clean_theme_colors(_raw jsonb)
 RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$
  SELECT coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
  FROM jsonb_each_text(CASE WHEN jsonb_typeof(_raw) = 'object' THEN _raw ELSE '{}'::jsonb END) AS e(k, v)
  WHERE k IN ('background','card','foreground','muted_foreground','border','accent') AND v ~ '^#[0-9a-fA-F]{6}$'
$$;

CREATE OR REPLACE FUNCTION public.save_organization_settings(_organization_id uuid, _name text, _description text, _settings jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ BEGIN IF NOT public.can_manage_organization(_organization_id) THEN RAISE EXCEPTION 'Forbidden'; END IF; IF length(trim(_name))<2 OR _settings->>'primary_color' !~ '^#[0-9a-fA-F]{6}$' OR _settings->>'secondary_color' !~ '^#[0-9a-fA-F]{6}$' THEN RAISE EXCEPTION 'Invalid settings'; END IF; UPDATE public.organizations SET name=left(trim(_name),120),description=left(_description,4000),visibility=CASE WHEN _settings->>'visibility' IN ('public','private') THEN _settings->>'visibility' ELSE visibility END,updated_at=now() WHERE id=_organization_id; UPDATE public.organization_settings SET contact_email=_settings->>'email',phone=_settings->>'phone',address=_settings->>'address',postal_code=_settings->>'postal_code',city=_settings->>'city',location=_settings->>'location',responsible_name=_settings->>'responsible_name',organization_type=_settings->>'type',primary_color=_settings->>'primary_color',secondary_color=_settings->>'secondary_color',theme_colors=CASE WHEN _settings ? 'theme_colors' THEN public.clean_theme_colors(_settings->'theme_colors') ELSE theme_colors END,logo_path=nullif(_settings->>'logo_path',''),cover_path=nullif(_settings->>'cover_path',''),social_links=coalesce(_settings->'social_links','{}'::jsonb),updated_at=now() WHERE organization_id=_organization_id; INSERT INTO public.organization_audit_events(organization_id,actor_id,action) VALUES(_organization_id,auth.uid(),'organization.settings_changed'); END $function$;

CREATE OR REPLACE FUNCTION public.get_public_organization_settings(_organization_id uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT jsonb_build_object('email',s.contact_email,'phone',s.phone,'address',s.address,'postal_code',s.postal_code,'city',s.city,'type',s.organization_type,'logo_path',s.logo_path,'cover_path',s.cover_path,'primary_color',s.primary_color,'secondary_color',s.secondary_color,'theme_colors',s.theme_colors,'social_links',s.social_links) FROM public.organization_settings s WHERE s.organization_id=_organization_id AND public.organization_is_public(_organization_id) $function$;