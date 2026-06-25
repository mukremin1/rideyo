ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS additional_driver_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS additional_driver_name TEXT,
  ADD COLUMN IF NOT EXISTS additional_driver_license TEXT,
  ADD COLUMN IF NOT EXISTS additional_driver_fee NUMERIC DEFAULT 0;
