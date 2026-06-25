CREATE TABLE IF NOT EXISTS public.car_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(car_id, blocked_date)
);

ALTER TABLE public.car_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their car blocked dates"
  ON public.car_blocked_dates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cars
      WHERE cars.id = car_blocked_dates.car_id
      AND cars.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can insert blocked dates for their cars"
  ON public.car_blocked_dates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cars
      WHERE cars.id = car_blocked_dates.car_id
      AND cars.owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete their car blocked dates"
  ON public.car_blocked_dates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.cars
      WHERE cars.id = car_blocked_dates.car_id
      AND cars.owner_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_car_blocked_dates_car_id ON public.car_blocked_dates(car_id);
