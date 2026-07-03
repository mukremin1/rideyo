-- GPS location history: admin-only viewing (owners no longer see tracking data).

DROP POLICY IF EXISTS "Car owners can view their GPS history" ON public.gps_location_history;

CREATE POLICY "Admins can view all GPS history"
  ON public.gps_location_history
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
