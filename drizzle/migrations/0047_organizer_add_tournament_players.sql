CREATE FUNCTION public.organizer_add_tournament_players(_tournament_id uuid, _first_name text, _last_name text, _email text, _phone text, _partner_first_name text DEFAULT '', _partner_last_name text DEFAULT '', _team_name text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tournaments%ROWTYPE; team uuid; label text; a text; b text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_manage_tournament(_tournament_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT * INTO t FROM public.tournaments WHERE id = _tournament_id FOR UPDATE;
 IF t.id IS NULL OR t.status <> 'open' THEN RAISE EXCEPTION 'TOURNAMENT_CLOSED'; END IF;
 IF t.max_participants IS NOT NULL AND (SELECT count(*) FROM public.tournament_teams WHERE tournament_id=t.id) >= t.max_participants THEN RAISE EXCEPTION 'TOURNAMENT_FULL'; END IF;
 IF char_length(trim(_first_name)) NOT BETWEEN 1 AND 60 OR char_length(trim(_last_name)) NOT BETWEEN 1 AND 60 OR char_length(_email) NOT BETWEEN 3 AND 255 OR _email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR _phone !~ '^\+?[0-9]{9,15}$' THEN RAISE EXCEPTION 'INVALID_CONTACT'; END IF;
 IF EXISTS(SELECT 1 FROM public.tournament_guest_registrations WHERE tournament_id=t.id AND lower(email)=lower(trim(_email))) THEN RAISE EXCEPTION 'ALREADY_REGISTERED'; END IF;
 IF t.format='equipe' THEN
  IF char_length(trim(_partner_first_name)) NOT BETWEEN 1 AND 60 OR char_length(trim(_partner_last_name)) NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'SECOND_PLAYER_REQUIRED'; END IF;
  a := trim(_first_name); b := trim(_partner_first_name);
  IF lower(a)=lower(b) OR EXISTS(SELECT 1 FROM public.tournament_teams existing CROSS JOIN LATERAL regexp_split_to_table(existing.name, '&') part WHERE existing.tournament_id=t.id AND lower(trim(regexp_replace(trim(part), ' [[:alpha:]]\.$', ''))) = lower(a)) THEN a := a || ' ' || upper(left(trim(_last_name),1)) || '.'; END IF;
  IF lower(trim(_first_name))=lower(b) OR EXISTS(SELECT 1 FROM public.tournament_teams existing CROSS JOIN LATERAL regexp_split_to_table(existing.name, '&') part WHERE existing.tournament_id=t.id AND lower(trim(regexp_replace(trim(part), ' [[:alpha:]]\.$', ''))) = lower(b)) THEN b := b || ' ' || upper(left(trim(_partner_last_name),1)) || '.'; END IF;
  label := coalesce(nullif(trim(_team_name),''), a || ' & ' || b);
 ELSE label := trim(_first_name) || ' ' || trim(_last_name);
 END IF;
 IF char_length(label)>120 OR char_length(trim(_team_name))>60 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
 INSERT INTO public.tournament_teams(tournament_id,name,name_locked) VALUES(t.id,label, t.format='equipe' AND trim(_team_name)<>'') RETURNING id INTO team;
 INSERT INTO public.tournament_guest_registrations(tournament_id,team_id,first_name,last_name,email,phone,partner_first_name,partner_last_name) VALUES(t.id,team,trim(_first_name),trim(_last_name),lower(trim(_email)),_phone,CASE WHEN t.format='equipe' THEN trim(_partner_first_name) END,CASE WHEN t.format='equipe' THEN trim(_partner_last_name) END);
 RETURN team;
END $$;
REVOKE ALL ON FUNCTION public.organizer_add_tournament_players(uuid,text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.organizer_add_tournament_players(uuid,text,text,text,text,text,text,text) TO authenticated;