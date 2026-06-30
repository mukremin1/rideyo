-- Admin fleet: view all cars, add cars, toggle rental availability, delete any car.

CREATE POLICY "Admins can view all cars"
  ON public.cars
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert cars"
  ON public.cars
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND auth.uid() = owner_id
  );

CREATE POLICY "Admins can update any car"
  ON public.cars
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any car"
  ON public.cars
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
