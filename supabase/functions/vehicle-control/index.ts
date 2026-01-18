import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, carId, bookingId, userId, latitude, longitude, notes } = await req.json();
    
    console.log(`[vehicle-control] Action: ${action} for car: ${carId}`);

    if (!action || !carId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "action ve carId gereklidir" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Araç bilgilerini al
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .single();

    if (carError || !car) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Araç bulunamadı" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result = {
      success: true,
      action,
      message: "",
      lockStatus: car.lock_status,
    };

    switch (action) {
      case "unlock":
        // Uzaktan kapı açma simülasyonu
        // Gerçek implementasyonda GPS cihazına komut gönderilir
        const { error: unlockError } = await supabase
          .from('cars')
          .update({ lock_status: 'unlocked' })
          .eq('id', carId);

        if (unlockError) throw unlockError;

        // Aksiyon kaydı
        await supabase.from('vehicle_actions').insert({
          car_id: carId,
          user_id: userId,
          action_type: 'unlock',
          latitude,
          longitude,
          notes: notes || 'Araç kapıları uzaktan açıldı',
        });

        result.message = "Araç kapıları başarıyla açıldı";
        result.lockStatus = "unlocked";
        break;

      case "lock":
        // Uzaktan kapı kilitleme simülasyonu
        const { error: lockError } = await supabase
          .from('cars')
          .update({ lock_status: 'locked' })
          .eq('id', carId);

        if (lockError) throw lockError;

        // Aksiyon kaydı
        await supabase.from('vehicle_actions').insert({
          car_id: carId,
          user_id: userId,
          action_type: 'lock',
          latitude,
          longitude,
          notes: notes || 'Araç kapıları uzaktan kilitlendi',
        });

        result.message = "Araç kapıları başarıyla kilitlendi";
        result.lockStatus = "locked";
        break;

      case "start_rental":
        // Kiralama başlatma
        const { error: startError } = await supabase
          .from('cars')
          .update({ 
            lock_status: 'unlocked',
            available: false 
          })
          .eq('id', carId);

        if (startError) throw startError;

        // Booking durumunu güncelle
        if (bookingId) {
          await supabase
            .from('bookings')
            .update({ payment_status: 'in_progress' })
            .eq('id', bookingId);
        }

        await supabase.from('vehicle_actions').insert({
          car_id: carId,
          user_id: userId,
          action_type: 'start_rental',
          latitude,
          longitude,
          notes: 'Kiralama başlatıldı',
        });

        result.message = "Kiralama başarıyla başlatıldı. Araç kapıları açık.";
        result.lockStatus = "unlocked";
        break;

      case "end_rental":
        // Kiralama bitirme
        const { error: endError } = await supabase
          .from('cars')
          .update({ 
            lock_status: 'locked',
            available: true 
          })
          .eq('id', carId);

        if (endError) throw endError;

        // Booking durumunu güncelle
        if (bookingId) {
          await supabase
            .from('bookings')
            .update({ payment_status: 'completed' })
            .eq('id', bookingId);
        }

        await supabase.from('vehicle_actions').insert({
          car_id: carId,
          user_id: userId,
          action_type: 'end_rental',
          latitude,
          longitude,
          notes: 'Kiralama bitirildi',
        });

        result.message = "Kiralama bitirildi. Araç kapıları kilitlendi.";
        result.lockStatus = "locked";
        break;

      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Geçersiz aksiyon" 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`[vehicle-control] Result:`, result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[vehicle-control] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
