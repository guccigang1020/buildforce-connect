CREATE POLICY "Admins can read contractor docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contractor-docs' AND public.has_role(auth.uid(), 'admin'));
