-- Overtime billing for minute/hour rentals after prepaid package expires

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS actual_end_time timestamptz,
  ADD COLUMN IF NOT EXISTS overtime_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_rate numeric NOT NULL DEFAULT 7.5,
  ADD COLUMN IF NOT EXISTS overtime_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_payment_status text NOT NULL DEFAULT 'none'
    CHECK (overtime_payment_status IN ('none', 'pending', 'charged', 'failed')),
  ADD COLUMN IF NOT EXISTS overtime_iyzico_payment_id text,
  ADD COLUMN IF NOT EXISTS payment_saved_card_id uuid REFERENCES public.saved_cards(id) ON DELETE SET NULL;

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
    'overtime_charge'
  ));
