import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  
  // "HIGH" içeren numaralar yüksek riskli
  if (cleaned.includes("HIGH") || cleaned.includes("YUKSEK")) {
    return {
      exists: true,
      isValid: true,
      isBlocked: false,
      penaltyPoints: 75,
      trafficViolations: 6,
      totalAccidents: 3,
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
  
  // Normal geçerli ehliyet - rastgele değerler
  const seed = cleaned.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const penaltyPoints = seed % 50; // 0-49 arası ceza puanı
  const violations = seed % 4; // 0-3 arası ihlal
  const accidents = seed % 2; // 0-1 arası kaza
  
  return {
    exists: true,
    isValid: true,
    isBlocked: false,
    penaltyPoints,
    trafficViolations: violations,
    totalAccidents: accidents,
    expiryDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    holderName: "****** ******", // Gizlilik için maskeli
    licenseClass: "B",
  };
}

// Risk seviyesi hesaplama
function calculateRiskLevel(penaltyPoints: number, accidents: number, violations: number): string {
  if (penaltyPoints >= 70 || accidents >= 3 || violations >= 5) return "high";
  if (penaltyPoints >= 30 || accidents >= 2 || violations >= 3) return "medium";
  return "low";
}

// Sürücü puanı hesaplama
function calculateDriverScore(penaltyPoints: number, accidents: number, violations: number): number {
  const raw = 100 - (penaltyPoints + accidents * 10 + violations * 5);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { licenseNumber, userId } = await req.json();
    
    console.log(`[verify-license] Checking license: ${licenseNumber} for user: ${userId}`);
    
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
            penaltyPoints: licenseData.penaltyPoints,
            trafficViolations: licenseData.trafficViolations,
            totalAccidents: licenseData.totalAccidents,
            riskLevel: "high",
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
            expiryDate: licenseData.expiryDate,
            riskLevel: "high",
            driverScore: 0,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Risk değerlendirmesi
    const riskLevel = calculateRiskLevel(
      licenseData.penaltyPoints, 
      licenseData.totalAccidents, 
      licenseData.trafficViolations
    );
    const driverScore = calculateDriverScore(
      licenseData.penaltyPoints,
      licenseData.totalAccidents,
      licenseData.trafficViolations
    );

    // 7. Yüksek riskli sürücüler kiralayamaz
    const canRent = riskLevel !== "high" && driverScore >= 60;
    
    let message = "";
    if (!canRent) {
      if (riskLevel === "high") {
        message = "Sürücü geçmişiniz nedeniyle şu an araç kiralama hizmetimizden yararlanamazsınız.";
      } else if (driverScore < 60) {
        message = `Sürücü puanınız (${driverScore}) kiralama için gereken minimum puanın (60) altında.`;
      }
    } else {
      message = "Ehliyet doğrulaması başarılı! Araç kiralayabilirsiniz.";
    }

    // 8. Eğer userId varsa, veritabanına kaydet
    if (userId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: upsertError } = await supabase
        .from('driver_history')
        .upsert({
          user_id: userId,
          license_number: licenseNumber.replace(/\s/g, '').toUpperCase(),
          penalty_points: licenseData.penaltyPoints,
          traffic_violations: licenseData.trafficViolations,
          total_accidents: licenseData.totalAccidents,
          driver_score: driverScore,
          is_approved: canRent,
          verification_status: canRent ? "verified" : "rejected",
          blocked_reason: !canRent ? message : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('[verify-license] Database upsert error:', upsertError);
      } else {
        console.log('[verify-license] Driver history saved successfully');
      }
    }

    console.log(`[verify-license] Result - canRent: ${canRent}, score: ${driverScore}, risk: ${riskLevel}`);

    return new Response(
      JSON.stringify({
        success: true,
        canRent,
        message,
        data: {
          driverScore,
          riskLevel,
          penaltyPoints: licenseData.penaltyPoints,
          trafficViolations: licenseData.trafficViolations,
          totalAccidents: licenseData.totalAccidents,
          expiryDate: licenseData.expiryDate,
          licenseClass: licenseData.licenseClass,
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
