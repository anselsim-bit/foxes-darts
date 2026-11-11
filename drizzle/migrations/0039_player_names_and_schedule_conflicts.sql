CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, display_name, first_name, last_name)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    nullif(left(trim(coalesce(new.raw_user_meta_data->>'first_name','')),60),''),
    nullif(left(trim(coalesce(new.raw_user_meta_data->>'last_name','')),60),''));
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.tournaments_overlap(_a uuid, _b uuid)
 RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT a.event_date = b.event_date
    AND coalesce(a.start_time, '00:00'::time) < coalesce(nullif(b.end_time, '00:00'::time), '23:59:59'::time)
    AND coalesce(b.start_time, '00:00'::time) < coalesce(nullif(a.end_time, '00:00'::time), '23:59:59'::time)
  FROM public.tournaments a, public.tournaments b WHERE a.id = _a AND b.id = _b
$$;

CREATE OR REPLACE FUNCTION public.prevent_overlapping_registration()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.registrations r
    WHERE r.user_id = NEW.user_id AND r.tournament_id <> NEW.tournament_id
      AND public.tournaments_overlap(r.tournament_id, NEW.tournament_id)
  ) THEN
    RAISE EXCEPTION 'SCHEDULE_CONFLICT';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS registrations_no_overlap ON public.registrations;
CREATE TRIGGER registrations_no_overlap BEFORE INSERT ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.prevent_overlapping_registration();