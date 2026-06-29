import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIyzicoConfig, iyzicoPost, isIyzicoSuccess } from "../_shared/iyzico.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, carId, bookingId, userId, latitude, longitude, notes } = await req.json();

    console.log(`[vehicle-control] Action: ${action} for car: ${carId}`);

    if (!action || !carId) {
      return new Response(
        JSON.stringify({ success: false, error: "action ve carId gereklidir" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: car, error: carError } = await supabase.from("cars").select("*").eq("id", carId).single();

    if (carError || !car) {
      return new Response(
        JSON.stringify({ success: false, error: "Arac bulunamadi" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result: { success: boolean; action: string; message: string; lockStatus: string | null } = {
      success: true,
      action,
      message: "",
      lockStatus: car.lock_status,
    };

    switch (action) {
      case "unlock": {
        const { error } = await supabase.from("cars").update({ lock_status: "unlocked" }).eq("id", carId);
        if (error) throw error;

        await supabase.from("vehicle_actions").insert({
          car_id: carId,
          user_id: userId,
          action_type: "unlock",
          latitude,
          longitude,
          notes: notes || "Arac kapilari uzaktan acildi",
        });

        result.message = "Arac kapilari basariyla acildi";
        result.lockStatus = "unlocked";
        break;
      }

      case "lock": {
        const { error } = await supabase.from("cars").update({ lock_status: "locked" }).eq("id", carId);
        if (error) throw error;

        await supabase.from("vehicle_actions").insert({
          car_id: carId,
          user_id: userId,
          action_type: "lock",
          latitude,
          longitude,
          notes: notes || "Arac kapilari uzaktan kilitlendi",
        });

        result.message = "Arac kapilari basariyla kilitlendi";
        result.lockStatus = "locked";
        break;
      }

      case "start_rental": {
        const { error } = await supabase
          .from("cars")
          .update({ lock_status: "unlocked", available: false })
          .eq("id", carId);
        if (error) throw error;

        if (bookingId) {
          await supabase.from("bookings").update({ payment_status: "in_progress" }).eq("id", bookingId);
        }

        await supabase.from("vehicle_actions").insert({
          car_id: carId,
          user_id: userId,
          action_type: "start_rental",
          latitude,
          longitude,
          notes: "Kiralama baslatildi",
        });

        result.message = "Kiralama basariyla baslatildi. Arac kapilari acik.";
        result.lockStatus = "unlocked";
        break;
      }

      case "end_rental": {
        const { error } = await supabase
          .from("cars")
          .update({ lock_status: "locked", available: true })
          .eq("id", carId);
        if (error) throw error;

        if (bookingId) {
          const { data: booking } = await supabase
            .from("bookings")
            .select("id, user_id, provision_status, provision_fee, iyzico_provision_payment_id")
            .eq("id", bookingId)
            .maybeSingle();

          if (booking?.provision_status === "held" && booking.iyzico_provision_payment_id) {
            await releaseProvisionHold(supabase, booking);
          } else if (booking?.provision_status === "held") {
            await supabase
              .from("bookings")
              .update({ provision_status: "released" })
              .eq("id", bookingId);
          }

          await supabase.from("bookings").update({ payment_status: "completed" }).eq("id", bookingId);
        }

        await supabase.from("vehicle_actions").insert({
          car_id: carId,
          user_id: userId,
          action_type: "end_rental",
          latitude,
          longitude,
          notes: "Kiralama bitirildi",
        });

        result.message = "Kiralama bitirildi. Arac kapilari kilitlendi.";
        result.lockStatus = "locked";
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "Gecersiz aksiyon" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[vehicle-control] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function releaseProvisionHold(
  supabase: ReturnType<typeof createClient>,
  booking: {
    id: string;
    user_id: string;
    provision_fee: number | null;
    iyzico_provision_payment_id: string;
  },
) {
  const iyzico = getIyzicoConfig();
  const allowDemo = Deno.env.get("PAYMENT_DEMO_MODE") === "true";

  if (iyzico) {
    const conversationId = `release-${booking.id}-${Date.now()}`;
    const cancelRes = await iyzicoPost("/payment/cancel", {
      locale: "tr",
      conversationId,
      paymentId: booking.iyzico_provision_payment_id,
      ip: "127.0.0.1",
    }, iyzico);

    await supabase.from("payment_transactions").insert({
      booking_id: booking.id,
      user_id: booking.user_id,
      type: "cancel_preauth",
      status: isIyzicoSuccess(cancelRes) ? "success" : "failed",
      amount: booking.provision_fee ?? 0,
      iyzico_conversation_id: conversationId,
      error_message: isIyzicoSuccess(cancelRes) ? null : cancelRes.errorMessage,
    });
  } else if (allowDemo) {
    await supabase.from("payment_transactions").insert({
      booking_id: booking.id,
      user_id: booking.user_id,
      type: "cancel_preauth",
      status: "success",
      amount: booking.provision_fee ?? 0,
      metadata: { mode: "demo" },
    });
  }

  await supabase
    .from("bookings")
    .update({ provision_status: "released" })
    .eq("id", booking.id);
}
