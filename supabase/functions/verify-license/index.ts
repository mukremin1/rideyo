import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ehliyet numarası formatı doğrulama - karakter kısıtlaması yok
function validateTurkishLicenseFormat(licenseNumber: string): { valid: boolean; error?: string } {
  const cleaned = licenseNumber.replace(/\s/g, '').trim();
  
  // Sadece boş olup olmadığını kontrol et
  if (!cleaned || cleaned.length === 0) {
    return { valid: false, error: "Ehliyet numarası boş olamaz" };
  }
  
  return { valid: true };
}

// Simüle edilmiş ehliyet veritabanı kontrolü
// Gerçek implementasyonda bu bir devlet API'sine bağlanır
function simulateLicenseCheck(licenseNumber: string): {
  exists: boolean;
  isValid: boolean;
  isBlocked: boolean;
  blockReason?: string;
  penaltyPoints: number;
  trafficViolations: number;
  totalAccidents: number;
  expiryDate?: string;
  holderName?: string;
  licenseClass?: string;
} {
  const cleaned = licenseNumber.replace(/\s/g, '').toUpperCase();
  
  // Test için bazı özel durumlar
  // "BLOCKED" içeren numaralar bloklanmış olarak döner
  if (cleaned.includes("BLOCKED") || cleaned.includes("IPTAL")) {
    return {
      exists: true,
      isValid: false,
      isBlocked: true,
      blockReason: "Ehliyet iptal edilmiş - Ağır trafik ihlali",
      penaltyPoints: 100,
      trafficViolations: 10,
      totalAccidents: 5,
    };
  }
  
  // "EXPIRED" içeren numaralar süresi dolmuş
  if (cleaned.includes("EXPIRED") || cleaned.includes("SURESI")) {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);
    return {
      exists: true,
      isValid: false,
      isBlocked: false,
      blockReason: "Ehliyet süresi dolmuş",
      penaltyPoints: 0,
      trafficViolations: 0,
      totalAccidents: 0,
      expiryDate: pastDate.toISOString().split('T')[0],
    };
  }
  
  // "HIGH" test anahtarı — artık normal kayıt gibi 100 puan
  if (cleaned.includes("HIGH") || cleaned.includes("YUKSEK")) {
    return {
      exists: true,
      isValid: true,
      isBlocked: false,
      penaltyPoints: 0,
      trafficViolations: 0,
      totalAccidents: 0,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      licenseClass: "B",
    };
  }
  
  // "NOTFOUND" içeren numaralar bulunamaz
  if (cleaned.includes("NOTFOUND") || cleaned.includes("BULUNAMADI")) {
    return {
      exists: false,
      isValid: false,
      isBlocked: false,
      penaltyPoints: 0,
      trafficViolations: 0,
      totalAccidents: 0,
    };
  }
  
  // Temiz kayıt — sürücü puanı 100’den başlar, ceza/kaza/ihlal yok
  return {
    exists: true,
    isValid: true,
    isBlocked: false,
    penaltyPoints: 0,
    trafficViolations: 0,
    totalAccidents: 0,
    expiryDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    holderName: "****** ******", // Gizlilik için maskeli
    licenseClass: "B",
  };
}

const DEFAULT_DRIVER_SCORE = 100;

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { licenseNumber, userId, nationalId, surname, givenNames } = await req.json();

    console.log(`[verify-license] Checking license: ${licenseNumber} for user: ${userId}, nationalId: ${nationalId ?? "—"}`);
    
    if (!licenseNumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          canRent: false,
          error: "Ehliyet numarası gereklidir",
          reason: "missing_license"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Format doğrulama
    const formatCheck = validateTurkishLicenseFormat(licenseNumber);
    if (!formatCheck.valid) {
      console.log(`[verify-license] Format validation failed: ${formatCheck.error}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: formatCheck.error,
          canRent: false,
          reason: "invalid_format"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Ehliyet veritabanı kontrolü (simüle)
    const licenseData = simulateLicenseCheck(licenseNumber);
    console.log(`[verify-license] License data:`, licenseData);

    // 3. Ehliyet bulunamadı
    if (!licenseData.exists) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Ehliyet sistemde bulunamadı. Lütfen doğru numarayı girdiğinizden emin olun.",
          canRent: false,
          reason: "not_found"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Ehliyet bloklanmış
    if (licenseData.isBlocked) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: licenseData.blockReason || "Bu ehliyet ile araç kiralanamaz",
          canRent: false,
          reason: "blocked",
          data: {
            driverScore: 0,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Ehliyet süresi dolmuş
    if (!licenseData.isValid && licenseData.expiryDate) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Ehliyetinizin süresi ${licenseData.expiryDate} tarihinde dolmuş. Lütfen ehliyetinizi yenileyin.`,
          canRent: false,
          reason: "expired",
          data: {
            driverScore: 0,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Başarılı doğrulama — her sürücü 100 puan ile başlar, kullanıma göre güncellenir
    const driverScore = DEFAULT_DRIVER_SCORE;
    const canRent = true;
    const message = "Ehliyet doğrulaması başarılı! Araç kiralayabilirsiniz.";
    if (userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Önceki kayıtlı TC Kimlik No ile eşleşme kontrolü
      if (nationalId) {
        const { data: existingRecord } = await supabase
          .from('driver_history')
          .select('national_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingRecord?.national_id && existingRecord.national_id !== nationalId) {
          console.warn(`[verify-license] TC Kimlik No mismatch for user ${userId}: stored=${existingRecord.national_id}, provided=${nationalId}`);
          return new Response(
            JSON.stringify({
              success: false,
              canRent: false,
              error: "Kimlik kartı bilgisi daha önce kayıtlı kimlikle eşleşmiyor. Lütfen destek ile iletişime geçin.",
              reason: "identity_mismatch",
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const { error: upsertError } = await supabase
        .from('driver_history')
        .upsert({
          user_id: userId,
          license_number: licenseNumber.replace(/\s/g, '').toUpperCase(),
          penalty_points: 0,
          traffic_violations: 0,
          total_accidents: 0,
          driver_score: driverScore,
          is_approved: canRent,
          verification_status: canRent ? "verified" : "rejected",
          blocked_reason: !canRent ? message : null,
          national_id: nationalId ?? null,
          verified_surname: surname ?? null,
          verified_given_names: givenNames ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('[verify-license] Database upsert error:', upsertError);
      } else {
        console.log('[verify-license] Driver history saved successfully');
      }
    }

    console.log(`[verify-license] Result - canRent: ${canRent}, score: ${driverScore}`);

    return new Response(
      JSON.stringify({
        success: true,
        canRent,
        message,
        data: {
          driverScore,
          isApproved: canRent,
          verificationStatus: canRent ? "verified" : "rejected",
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-license] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata',
        canRent: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
