DROP POLICY IF EXISTS "Anyone can read tournament photos" ON storage.objects;
CREATE POLICY "Admins can read tournament photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tournament-photos' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
CREATE POLICY "Users read own profile, admins read all" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));