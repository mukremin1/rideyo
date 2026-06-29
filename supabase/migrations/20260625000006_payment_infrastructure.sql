-- Payment infrastructure: status normalization, transactions, owner payouts, booking fee columns

-- Normalize payment_status constraint (app + vehicle-control values)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;

UPDATE public.bookings SET payment_status = 'completed' WHERE payment_status = 'paid';

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN (
    'pending',
    'authorized',
    'completed',
    'in_progress',
    'failed',
    'refunded',
    'cancelled'
  ));

-- Fee breakdown persisted on booking for payment split
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS rental_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provision_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provision_status text DEFAULT 'pending'
    CHECK (provision_status IN ('pending', 'held', 'released', 'captured', 'failed')),
  ADD COLUMN IF NOT EXISTS iyzico_payment_id text,
  ADD COLUMN IF NOT EXISTS iyzico_conversation_id text,
  ADD COLUMN IF NOT EXISTS iyzico_provision_payment_id text;

-- Payment audit log
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('charge', 'preauth', 'capture', 'refund', 'cancel_preauth', 'payout')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'TRY',
  iyzico_payment_id text,
  iyzico_conversation_id text,
  platform_commission numeric DEFAULT 0,
  owner_payout_amount numeric DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment transactions"
  ON public.payment_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can view payout transactions"
  ON public.payment_transactions FOR SELECT
  USING (auth.uid() = owner_id);

-- Car owner marketplace / payout profile (iyzico SubMerchant)
CREATE TABLE IF NOT EXISTS public.owner_payout_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  sub_merchant_key text,
  sub_merchant_external_id text,
  contact_name text NOT NULL,
  contact_surname text NOT NULL,
  email text NOT NULL,
  gsm_number text NOT NULL,
  identity_number text NOT NULL,
  iban text NOT NULL,
  address text NOT NULL,
  tax_office text,
  legal_company_title text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'rejected', 'suspended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.owner_payout_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own payout profile"
  ON public.owner_payout_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert own payout profile"
  ON public.owner_payout_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update own payout profile"
  ON public.owner_payout_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_owner_payout_profiles_updated_at
  BEFORE UPDATE ON public.owner_payout_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- iyzico card user key on profile (one per buyer)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS iyzico_card_user_key text;

-- Saved cards: token-only storage (PCI safe)
ALTER TABLE public.saved_cards
  ADD COLUMN IF NOT EXISTS iyzico_card_token text,
  ADD COLUMN IF NOT EXISTS iyzico_card_user_key text;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking_id ON public.payment_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_owner_payout_profiles_user_id ON public.owner_payout_profiles(user_id);
