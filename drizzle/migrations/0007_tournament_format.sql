ALTER TABLE public.tournaments ADD COLUMN format text NOT NULL DEFAULT 'solo';
ALTER TABLE public.tournaments ADD COLUMN max_participants integer;
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_format_check CHECK (format IN ('solo','equipe'));
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_max_check CHECK (max_participants IS NULL OR max_participants > 0);