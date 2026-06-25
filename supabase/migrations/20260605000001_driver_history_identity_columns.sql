-- Add identity verification columns to driver_history.
-- national_id: TC Kimlik Numarası read from the eID chip (ICAO 9303 DG1).
-- verified_surname / verified_given_names: name fields from the chip.
-- national_id has a UNIQUE constraint so a single TC No cannot be linked to multiple accounts.

ALTER TABLE public.driver_history
  ADD COLUMN IF NOT EXISTS national_id         TEXT,
  ADD COLUMN IF NOT EXISTS verified_surname    TEXT,
  ADD COLUMN IF NOT EXISTS verified_given_names TEXT;

-- Prevent the same TC Kimlik No from being registered under two different user accounts.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'driver_history_national_id_unique'
  ) THEN
    ALTER TABLE public.driver_history
      ADD CONSTRAINT driver_history_national_id_unique UNIQUE (national_id);
  END IF;
END $$;

-- RLS: users can only read/write their own row (existing policy already covers user_id;
-- these new columns inherit that protection automatically).
