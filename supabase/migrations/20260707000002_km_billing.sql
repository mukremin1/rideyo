-- KM billing: package allowance + per-km charge when no package or over limit

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS km_package_id text,
  ADD COLUMN IF NOT EXISTS km_package_included_km integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS km_package_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_distance_km numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chargeable_km numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS km_rate numeric NOT NULL DEFAULT 26.5,
  ADD COLUMN IF NOT EXISTS km_charge_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS km_charge_status text NOT NULL DEFAULT 'none'
    CHECK (km_charge_status IN ('none', 'pending', 'charged', 'failed')),
  ADD COLUMN IF NOT EXISTS km_iyzico_payment_id text;

ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_type_check;

ALTER TABLE public.payment_transactions
  ADD CONSTRAINT payment_transactions_type_check
  CHECK (type IN (
    'charge',
    'preauth',
    'capture',
    'refund',
    'cancel_preauth',
    'payout',
    'overtime_charge',
    'km_charge'
  ));
