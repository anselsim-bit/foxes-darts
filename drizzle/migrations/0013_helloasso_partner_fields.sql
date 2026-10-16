ALTER TABLE public.helloasso_registrations
  ADD COLUMN IF NOT EXISTS partner_first_name text,
  ADD COLUMN IF NOT EXISTS partner_last_name text,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb;

GRANT ALL ON public.helloasso_registrations TO service_role;
GRANT SELECT ON public.helloasso_registrations TO authenticated;