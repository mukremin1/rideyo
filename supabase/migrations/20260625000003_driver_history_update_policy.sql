-- UPDATE policy: WITH CHECK ekle (upsert güncellemeleri için)
DROP POLICY IF EXISTS "Users can update their own driver history" ON public.driver_history;

CREATE POLICY "Users can update their own driver history"
ON public.driver_history
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
