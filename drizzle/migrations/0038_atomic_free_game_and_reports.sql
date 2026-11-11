ALTER TABLE public.games ADD COLUMN client_key uuid;
CREATE UNIQUE INDEX games_client_key_unique ON public.games(client_key) WHERE client_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_free_game(_recorded_by uuid, _client_key uuid, _tournament_id uuid, _start_score integer, _double_out boolean, _winner_name text, _players jsonb, _solo boolean)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE inserted uuid; n integer := 0; p jsonb;
BEGIN
  INSERT INTO public.games(tournament_id,start_score,double_out,winner_name,recorded_by,players,client_key)
  VALUES(_tournament_id,_start_score,_double_out,_winner_name,_recorded_by,_players,_client_key)
  ON CONFLICT (client_key) WHERE client_key IS NOT NULL DO NOTHING RETURNING id INTO inserted;
  IF inserted IS NULL THEN RETURN 0; END IF;
  FOR p IN SELECT * FROM jsonb_array_elements(_players) LOOP
    IF p->>'user_id' IS NOT NULL THEN
      INSERT INTO public.player_stats(user_id,matches_played,wins,losses,best_score,updated_at)
      VALUES((p->>'user_id')::uuid,1,CASE WHEN NOT _solo AND (p->>'won')::boolean THEN 1 ELSE 0 END,CASE WHEN NOT _solo AND NOT (p->>'won')::boolean THEN 1 ELSE 0 END,coalesce((p->>'best_visit')::int,0),now())
      ON CONFLICT (user_id) DO UPDATE SET matches_played=player_stats.matches_played+1,wins=player_stats.wins+EXCLUDED.wins,losses=player_stats.losses+EXCLUDED.losses,best_score=greatest(player_stats.best_score,EXCLUDED.best_score),updated_at=now();
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.record_free_game(uuid,uuid,uuid,integer,boolean,text,jsonb,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_free_game(uuid,uuid,uuid,integer,boolean,text,jsonb,boolean) TO service_role;

CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (length(trim(reason)) BETWEEN 5 AND 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  CHECK (organization_id IS NOT NULL OR tournament_id IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_reports_insert_own ON public.content_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid() AND status = 'open');
CREATE POLICY content_reports_read ON public.content_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.is_platform_admin());
CREATE POLICY content_reports_admin_update ON public.content_reports FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.avatar_owner(_path text) RETURNS uuid LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
BEGIN
  IF _path !~ '^avatars/[0-9a-fA-F-]{36}/[^/]+$' OR _path LIKE '%..%' THEN RETURN NULL; END IF;
  RETURN split_part(_path,'/',2)::uuid;
EXCEPTION WHEN invalid_text_representation THEN RETURN NULL;
END $$;
CREATE POLICY "Users manage own avatar insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='tournament-photos' AND public.avatar_owner(name)=auth.uid());
CREATE POLICY "Users manage own avatar read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='tournament-photos' AND public.avatar_owner(name)=auth.uid());
CREATE POLICY "Users manage own avatar delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='tournament-photos' AND public.avatar_owner(name)=auth.uid());