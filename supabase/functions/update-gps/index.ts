import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation helper functions
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function validateGPSData(data: unknown): { valid: boolean; error?: string; parsed?: {
  carId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  batteryLevel?: number;
}} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { carId, latitude, longitude, speed, heading, batteryLevel } = data as Record<string, unknown>;

  // Validate carId (required, must be UUID)
  if (!carId || typeof carId !== 'string' || !isValidUUID(carId)) {
    return { valid: false, error: 'carId must be a valid UUID' };
  }

  // Validate latitude (required, -90 to 90)
  if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
    return { valid: false, error: 'latitude must be a number between -90 and 90' };
  }

  // Validate longitude (required, -180 to 180)
  if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
    return { valid: false, error: 'longitude must be a number between -180 and 180' };
  }

  // Validate speed (optional, 0-300 km/h)
  if (speed !== undefined && (typeof speed !== 'number' || speed < 0 || speed > 300)) {
    return { valid: false, error: 'speed must be a number between 0 and 300' };
  }

  // Validate heading (optional, 0-360 degrees)
  if (heading !== undefined && (typeof heading !== 'number' || heading < 0 || heading > 360)) {
    return { valid: false, error: 'heading must be a number between 0 and 360' };
  }

  // Validate batteryLevel (optional, 0-100)
  if (batteryLevel !== undefined && (typeof batteryLevel !== 'number' || batteryLevel < 0 || batteryLevel > 100)) {
    return { valid: false, error: 'batteryLevel must be a number between 0 and 100' };
  }

  return {
    valid: true,
    parsed: {
      carId: carId as string,
      latitude: latitude as number,
      longitude: longitude as number,
      speed: speed as number | undefined,
      heading: heading as number | undefined,
      batteryLevel: batteryLevel as number | undefined,
    }
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    const rawData = await req.json();
    const validation = validateGPSData(rawData);
    
    if (!validation.valid || !validation.parsed) {
      console.error('Validation error:', validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const { carId, latitude, longitude, speed, heading, batteryLevel } = validation.parsed;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Updating GPS for car:', carId);

    // Verify the car exists before updating
    const { data: carData, error: carError } = await supabaseClient
      .from('cars')
      .select('id')
      .eq('id', carId)
      .single();

    if (carError || !carData) {
      console.error('Car not found:', carId);
      return new Response(
        JSON.stringify({ error: 'Car not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Update car's current location
    const { error: updateError } = await supabaseClient
      .from('cars')
      .update({
        latitude,
        longitude,
        speed: speed ?? 0,
        heading: heading ?? 0,
        battery_level: batteryLevel ?? 100,
        last_gps_update: new Date().toISOString(),
      })
      .eq('id', carId);

    if (updateError) {
      console.error('Error updating car GPS:', updateError);
      throw updateError;
    }

    // Insert into GPS history
    const { error: historyError } = await supabaseClient
      .from('gps_location_history')
      .insert({
        car_id: carId,
        latitude,
        longitude,
        speed: speed ?? 0,
        heading: heading ?? 0,
        timestamp: new Date().toISOString(),
      });

    if (historyError) {
      console.error('Error inserting GPS history:', historyError);
      throw historyError;
    }

    console.log('GPS updated successfully for car:', carId);

    return new Response(
      JSON.stringify({ success: true, message: 'GPS updated successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in update-gps function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
