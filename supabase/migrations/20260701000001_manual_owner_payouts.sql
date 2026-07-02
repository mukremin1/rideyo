-- Manual owner payouts: track status; admin marks transfers done (no iyzico auto-split)

ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS owner_payout_status text DEFAULT 'pending'
    CHECK (owner_payout_status IN ('pending', 'paid_manual', 'not_applicable'));

UPDATE public.payment_transactions
SET owner_payout_status = 'pending'
WHERE type = 'charge'
  AND status = 'success'
  AND owner_id IS NOT NULL
  AND (owner_payout_status IS NULL OR owner_payout_status = 'pending');

UPDATE public.payment_transactions
SET owner_payout_status = 'not_applicable'
WHERE owner_id IS NULL OR type <> 'charge';

CREATE INDEX IF NOT EXISTS idx_payment_transactions_owner_payout_status
  ON public.payment_transactions(owner_payout_status)
  WHERE type = 'charge' AND status = 'success';

-- Admin can view/update all payment transactions (manual hakediş)
DROP POLICY IF EXISTS "Admins can view all payment transactions" ON public.payment_transactions;
CREATE POLICY "Admins can view all payment transactions"
  ON public.payment_transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update payment transactions" ON public.payment_transactions;
CREATE POLICY "Admins can update payment transactions"
  ON public.payment_transactions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert payout records" ON public.payment_transactions;
CREATE POLICY "Admins can insert payout records"
  ON public.payment_transactions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can read owner bank details for manual transfer
DROP POLICY IF EXISTS "Admins can view owner payout profiles" ON public.owner_payout_profiles;
CREATE POLICY "Admins can view owner payout profiles"
  ON public.owner_payout_profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
