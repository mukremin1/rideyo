-- Yeni ve eksik kayıtlar 100 puan ile başlasın
UPDATE public.driver_history
SET driver_score = 100
WHERE driver_score IS NULL;

ALTER TABLE public.driver_history
  ALTER COLUMN driver_score SET DEFAULT 100;
