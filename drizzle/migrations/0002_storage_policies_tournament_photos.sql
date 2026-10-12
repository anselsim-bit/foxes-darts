create policy "Anyone can read tournament photos"
on storage.objects for select to anon, authenticated
using (bucket_id = 'tournament-photos');

create policy "Admins can upload tournament photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'tournament-photos' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can update tournament photos"
on storage.objects for update to authenticated
using (bucket_id = 'tournament-photos' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete tournament photos"
on storage.objects for delete to authenticated
using (bucket_id = 'tournament-photos' and public.has_role(auth.uid(), 'admin'));