CREATE TABLE public.helloasso_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  item_id bigint NOT NULL UNIQUE,
  first_name text,
  last_name text,
  email text,
  amount_cents integer NOT NULL DEFAULT 0,
  tier_name text,
  state text,
  paid_at timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.helloasso_registrations TO authenticated;
GRANT ALL ON public.helloasso_registrations TO service_role;
ALTER TABLE public.helloasso_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read helloasso regs" ON public.helloasso_registrations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete helloasso regs" ON public.helloasso_registrations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));