-- Fix overly permissive INSERT policies

-- Drop and recreate vehicle_alerts INSERT policy to restrict to service role only
DROP POLICY IF EXISTS "System can create vehicle alerts" ON public.vehicle_alerts;
CREATE POLICY "Only service role can create vehicle alerts" 
ON public.vehicle_alerts 
FOR INSERT 
WITH CHECK (false);

-- Drop and recreate gps_location_history INSERT policy  
DROP POLICY IF EXISTS "System can insert GPS data" ON public.gps_location_history;
CREATE POLICY "Only service role can insert GPS data" 
ON public.gps_location_history 
FOR INSERT 
WITH CHECK (false);

-- Drop and recreate notifications INSERT policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Only service role can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (false);