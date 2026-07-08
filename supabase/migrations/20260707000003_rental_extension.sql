-- Rental extension payments

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
    'km_charge',
    'extension_charge'
  ));
