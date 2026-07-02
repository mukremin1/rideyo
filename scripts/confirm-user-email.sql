-- Supabase Dashboard → SQL Editor → Run
-- Replace email below, then user can sign in without waiting for verification mail.

UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  confirmed_at = COALESCE(confirmed_at, NOW())
WHERE lower(email) = lower('mukremin.cakmak.da@gmail.com');
