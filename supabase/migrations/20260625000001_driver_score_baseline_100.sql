-- Sürücü kaydı yokken başlangıç puanı 100 dönsün
CREATE OR REPLACE FUNCTION public.check_driver_eligibility(p_user_id UUID)
RETURNS TABLE (
  is_eligible BOOLEAN,
  reason TEXT,
  driver_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_history RECORD;
BEGIN
  SELECT * INTO v_driver_history
  FROM public.driver_history
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_driver_history IS NULL THEN
    RETURN QUERY SELECT false, 'Sürücü belgesi doğrulanmamış', 100;
    RETURN;
  END IF;

  IF NOT v_driver_history.is_approved THEN
    RETURN QUERY SELECT false, 'Sürücü belgesi onay bekliyor', COALESCE(v_driver_history.driver_score, 100);
    RETURN;
  END IF;

  IF COALESCE(v_driver_history.driver_score, 100) < 60 THEN
    RETURN QUERY SELECT false,
      'Sürücü puanınız yetersiz (minimum 60 gerekli)',
      COALESCE(v_driver_history.driver_score, 100);
    RETURN;
  END IF;

  IF v_driver_history.penalty_points > 70 THEN
    RETURN QUERY SELECT false,
      'Ehliyet ceza puanınız çok yüksek',
      COALESCE(v_driver_history.driver_score, 100);
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Uygun', COALESCE(v_driver_history.driver_score, 100);
END;
$$;
