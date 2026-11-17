DROP TRIGGER IF EXISTS enforce_signup_age ON auth.users;
COMMENT ON FUNCTION public.enforce_signup_age() IS 'DEPRECATED: signup age restriction disabled at the site owner request; no auth trigger calls this function.';
COMMENT ON FUNCTION public.signup_age_allowed(jsonb) IS 'DEPRECATED: legacy signup age declaration validator; not used for new registrations.';