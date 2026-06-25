import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PaymentRequest = {
  bookingId: string;
  cardHolder?: string;
  lastFourDigits?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Yetkilendirme gerekli" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Geçersiz oturum" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: PaymentRequest = await req.json();
    if (!body.bookingId) {
      return new Response(JSON.stringify({ error: "Rezervasyon ID gerekli" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .select("id, user_id, payment_status, total_price")
      .eq("id", body.bookingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Rezervasyon bulunamadı" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.payment_status === "paid") {
      return new Response(JSON.stringify({ success: true, alreadyPaid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.payment_status !== "pending") {
      return new Response(JSON.stringify({ error: "Rezervasyon ödemeye uygun değil" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const iyzicoApiKey = Deno.env.get("IYZICO_API_KEY");
    const iyzicoSecretKey = Deno.env.get("IYZICO_SECRET_KEY");

    if (iyzicoApiKey && iyzicoSecretKey) {
      // Iyzico entegrasyonu: API anahtarları tanımlıysa burada gerçek ödeme çağrısı yapılır.
      // Şimdilik demo moduna düşülüyor; production'da iyzico REST API kullanılmalı.
      console.log("Iyzico anahtarları mevcut — gerçek ödeme entegrasyonu yapılandırılmalı.");
    }

    const { data: updated, error: updateError } = await adminClient
      .from("bookings")
      .update({ payment_status: "paid" })
      .eq("id", body.bookingId)
      .eq("user_id", user.id)
      .eq("payment_status", "pending")
      .select("id")
      .maybeSingle();

    if (updateError || !updated) {
      return new Response(JSON.stringify({ error: "Ödeme durumu güncellenemedi" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: iyzicoApiKey ? "iyzico_pending" : "demo",
        amount: booking.total_price,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("process-payment error:", error);
    return new Response(JSON.stringify({ error: "Ödeme işlemi başarısız" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
