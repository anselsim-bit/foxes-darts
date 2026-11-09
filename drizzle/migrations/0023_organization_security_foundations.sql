CREATE TABLE public.organizations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 name text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
 created_by uuid REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizations TO anon, authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.platform_roles (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role = 'SUPER_ADMIN'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, role)
);
GRANT SELECT ON public.platform_roles TO authenticated;
GRANT ALL ON public.platform_roles TO service_role;
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_roles_self_read ON public.platform_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.organization_members (
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('ORGANIZATION_OWNER','ORGANIZATION_ADMIN','TOURNAMENT_MANAGER')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (organization_id, user_id)
);
GRANT SELECT ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX organization_members_user_idx ON public.organization_members(user_id, organization_id);

CREATE FUNCTION public.is_platform_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.platform_roles WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN')
$$;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

CREATE FUNCTION public.can_manage_organization(_organization_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = _organization_id AND o.status = 'active'
 AND (public.is_platform_admin() OR EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = o.id AND m.user_id = auth.uid() AND m.role IN ('ORGANIZATION_OWNER','ORGANIZATION_ADMIN'))))
$$;
REVOKE ALL ON FUNCTION public.can_manage_organization(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_organization(uuid) TO authenticated, service_role;

CREATE FUNCTION public.is_organization_member(_organization_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = _organization_id AND user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.is_organization_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_organization_member(uuid) TO authenticated, service_role;

CREATE POLICY organizations_public_read ON public.organizations FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY organizations_private_read ON public.organizations FOR SELECT TO authenticated USING (public.is_platform_admin() OR public.is_organization_member(id));
CREATE POLICY organization_members_read ON public.organization_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.can_manage_organization(organization_id) OR public.is_platform_admin());

CREATE TABLE public.organization_settings (
 organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
 contact_email text,
 location text,
 organization_type text,
 logo_path text,
 primary_color text,
 secondary_color text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organization_settings TO authenticated;
GRANT ALL ON public.organization_settings TO service_role;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY organization_settings_management_read ON public.organization_settings FOR SELECT TO authenticated USING (public.can_manage_organization(organization_id) OR public.is_platform_admin());

CREATE TABLE public.organization_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 email text NOT NULL,
 role text NOT NULL CHECK (role IN ('ORGANIZATION_ADMIN','TOURNAMENT_MANAGER')),
 token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')),
 invited_by uuid NOT NULL REFERENCES public.profiles(id),
 accepted_by uuid REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.organization_invitations TO service_role;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
CREATE INDEX organization_invitations_organization_idx ON public.organization_invitations(organization_id, status);

CREATE TABLE public.tournament_manager_assignments (
 tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 assigned_by uuid NOT NULL REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (tournament_id, user_id)
);
GRANT SELECT ON public.tournament_manager_assignments TO authenticated;
GRANT ALL ON public.tournament_manager_assignments TO service_role;
ALTER TABLE public.tournament_manager_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY assignments_self_read ON public.tournament_manager_assignments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_platform_admin());

CREATE TABLE public.organization_players (
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (organization_id, user_id)
);
GRANT SELECT ON public.organization_players TO authenticated;
GRANT ALL ON public.organization_players TO service_role;
ALTER TABLE public.organization_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY organization_players_read ON public.organization_players FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.can_manage_organization(organization_id));

CREATE TABLE public.notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
 kind text NOT NULL,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 read_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_recipient_read ON public.notifications FOR SELECT TO authenticated USING (recipient_id = auth.uid());
CREATE INDEX notifications_recipient_idx ON public.notifications(recipient_id, created_at DESC);

CREATE TABLE public.organization_audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid REFERENCES public.organizations(id),
 actor_id uuid REFERENCES public.profiles(id),
 action text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organization_audit_events TO authenticated;
GRANT ALL ON public.organization_audit_events TO service_role;
ALTER TABLE public.organization_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_platform_read ON public.organization_audit_events FOR SELECT TO authenticated USING (public.is_platform_admin());
CREATE INDEX organization_audit_events_organization_idx ON public.organization_audit_events(organization_id, created_at DESC);
COMMENT ON TABLE public.organizations IS 'Phase 2: creation is service-only; do not enable second-organization onboarding before legacy server, RLS and storage paths are scoped.';