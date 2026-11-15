ALTER TABLE public.tournament_guest_registrations DROP CONSTRAINT tournament_guest_registrations_email_check, DROP CONSTRAINT tournament_guest_registrations_phone_check, DROP CONSTRAINT tournament_guest_registrations_last_name_check, DROP CONSTRAINT tournament_guest_registrations_tournament_id_email_key;
ALTER TABLE public.tournament_guest_registrations ADD CONSTRAINT tournament_guest_registrations_email_check CHECK (email = '' OR char_length(email) BETWEEN 3 AND 255), ADD CONSTRAINT tournament_guest_registrations_phone_check CHECK (phone = '' OR char_length(phone) BETWEEN 6 AND 30), ADD CONSTRAINT tournament_guest_registrations_last_name_check CHECK (char_length(last_name) BETWEEN 0 AND 60);
CREATE UNIQUE INDEX guest_registration_nonempty_email ON public.tournament_guest_registrations(tournament_id, email) WHERE email <> '';
CREATE OR REPLACE FUNCTION public.organizer_add_tournament_players(_tournament_id uuid, _first_name text, _last_name text, _email text, _phone text, _partner_first_name text DEFAULT '', _partner_last_name text DEFAULT '', _team_name text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tournaments%ROWTYPE; team uuid; label text; a text; b text; suffix text := left(gen_random_uuid()::text,8);
BEGIN
 IF auth.uid() IS NULL OR NOT public.can_manage_tournament(_tournament_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT * INTO t FROM public.tournaments WHERE id = _tournament_id FOR UPDATE;
 IF t.id IS NULL OR t.status <> 'open' THEN RAISE EXCEPTION 'TOURNAMENT_CLOSED'; END IF;
 IF t.max_participants IS NOT NULL AND (SELECT count(*) FROM public.tournament_teams WHERE tournament_id=t.id) >= t.max_participants THEN RAISE EXCEPTION 'TOURNAMENT_FULL'; END IF;
 _first_name := trim(coalesce(_first_name,'')); _last_name := trim(coalesce(_last_name,'')); _partner_first_name := trim(coalesce(_partner_first_name,'')); _partner_last_name := trim(coalesce(_partner_last_name,'')); _team_name := trim(coalesce(_team_name,'')); _email := lower(trim(coalesce(_email,''))); _phone := trim(coalesce(_phone,''));
 IF char_length(_first_name)>60 OR char_length(_last_name)>60 OR char_length(_partner_first_name)>60 OR char_length(_partner_last_name)>60 OR char_length(_team_name)>60 OR (_email<>'' AND (char_length(_email)>255 OR _email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) OR (_phone<>'' AND _phone !~ '^\+?[0-9]{9,15}$') THEN RAISE EXCEPTION 'INVALID_CONTACT'; END IF;
 IF _email<>'' AND EXISTS(SELECT 1 FROM public.tournament_guest_registrations WHERE tournament_id=t.id AND lower(email)=_email) THEN RAISE EXCEPTION 'ALREADY_REGISTERED'; END IF;
 IF _first_name='' THEN _first_name := CASE WHEN _last_name<>'' THEN 'Joueur' ELSE 'Test ' || suffix END; END IF;
 IF t.format='equipe' THEN
  IF _partner_first_name='' THEN _partner_first_name := CASE WHEN _partner_last_name<>'' THEN 'Joueur' ELSE 'Test ' || suffix || ' bis' END; END IF;
  a := _first_name; b := _partner_first_name;
  IF _last_name<>'' AND (lower(a)=lower(b) OR EXISTS(SELECT 1 FROM public.tournament_teams existing CROSS JOIN LATERAL regexp_split_to_table(existing.name, '&') part WHERE existing.tournament_id=t.id AND lower(trim(regexp_replace(trim(part), ' [[:alpha:]]\.$', ''))) = lower(a))) THEN a := a || ' ' || upper(left(_last_name,1)) || '.'; END IF;
  IF _partner_last_name<>'' AND (lower(_first_name)=lower(b) OR EXISTS(SELECT 1 FROM public.tournament_teams existing CROSS JOIN LATERAL regexp_split_to_table(existing.name, '&') part WHERE existing.tournament_id=t.id AND lower(trim(regexp_replace(trim(part), ' [[:alpha:]]\.$', ''))) = lower(b))) THEN b := b || ' ' || upper(left(_partner_last_name,1)) || '.'; END IF;
  label := coalesce(nullif(_team_name,''), a || ' & ' || b);
 ELSE label := trim(_first_name || ' ' || _last_name);
 END IF;
 IF char_length(label)>120 THEN RAISE EXCEPTION 'INVALID_NAME'; END IF;
 INSERT INTO public.tournament_teams(tournament_id,name,name_locked) VALUES(t.id,label, t.format='equipe' AND _team_name<>'') RETURNING id INTO team;
 INSERT INTO public.tournament_guest_registrations(tournament_id,team_id,first_name,last_name,email,phone,partner_first_name,partner_last_name) VALUES(t.id,team,_first_name,_last_name,_email,_phone,CASE WHEN t.format='equipe' THEN _partner_first_name END,CASE WHEN t.format='equipe' THEN _partner_last_name END);
 RETURN team;
END $$;
REVOKE ALL ON FUNCTION public.organizer_add_tournament_players(uuid,text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.organizer_add_tournament_players(uuid,text,text,text,text,text,text,text) TO authenticated;