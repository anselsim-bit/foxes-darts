CREATE TABLE public.tournament_settings_codes (
  tournament_id uuid PRIMARY KEY REFERENCES public.tournaments(id) ON DELETE CASCADE,
  code text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tournament_settings_codes TO service_role;
ALTER TABLE public.tournament_settings_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.tournament_code_claims (
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tournament_id, user_id)
);
GRANT ALL ON public.tournament_code_claims TO service_role;
ALTER TABLE public.tournament_code_claims ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.tournament_access_codes IS 'DEPRECATED: replaced by tournament_settings_codes (one admin-set code per tournament)';