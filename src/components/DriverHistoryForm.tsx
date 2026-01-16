import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PENALTY_THRESHOLD = 70; // DB ile uyumlu tutun

interface DriverHistoryFormProps {
  userId: string;
  onVerified: (isApproved: boolean, riskLevel: string) => void;
}

const DriverHistoryForm = ({ userId, onVerified }: DriverHistoryFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [driverData, setDriverData] = useState({
    licenseNumber: "",
    penaltyPoints: 0,
    totalAccidents: 0,
    trafficViolations: 0,
  });
  const [verificationResult, setVerificationResult] = useState<{
    isApproved: boolean;
    riskLevel: string;
    message: string;
  } | null>(null);

  const calculateRiskLevel = (points: number, accidents: number, violations: number) => {
    if (points >= PENALTY_THRESHOLD || accidents >= 3 || violations >= 5) return "high";
    if (points >= 30 || accidents >= 2 || violations >= 3) return "medium";
    return "low";
  };

  const computeDriverScore = (points: number, accidents: number, violations: number) => {
    const raw = 100 - (points + accidents * 10 + violations * 5);
    return Math.max(0, Math.min(100, Math.round(raw)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!userId) {
      toast({ title: "Giriş Gerekli", description: "Sürücü bilgilerini kaydetmek için giriş yapmalısınız.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      const driverScore = computeDriverScore(driverData.penaltyPoints, driverData.totalAccidents, driverData.trafficViolations);

      const isApproved = driverScore >= 60 &&
        driverData.penaltyPoints <= PENALTY_THRESHOLD &&
        driverData.totalAccidents < 3 &&
        driverData.trafficViolations < 5;

      const payload = {
        user_id: userId,
        license_number: driverData.licenseNumber,
        penalty_points: driverData.penaltyPoints,
        total_accidents: driverData.totalAccidents,
        traffic_violations: driverData.trafficViolations,
        driver_score: driverScore,
        is_approved: isApproved,
        verification_status: isApproved ? "verified" : "rejected",
      };

      console.debug("DriverHistory payload:", payload);

      // 1) Mevcut kaydı kontrol et
      const { data: existing, error: selectError } = await supabase
        .from("driver_history")
        .select("id, user_id")
        .eq("user_id", userId)
        .maybeSingle(); // maybeSingle toleranslıdır: olmayan için hata fırlatmaz

      if (selectError) {
        console.error("Select error:", selectError);
        // Eğer permission/authorization hatası ise ayrıntılı bilgi ver
        toast({ title: "Veritabanı hatası", description: selectError.message ?? "Kayıt kontrol edilemedi", variant: "destructive" });
        setLoading(false);
        return;
      }

      console.debug("Existing driver_history:", existing);

      let result: any = null;
      let op: "insert" | "update";

      if (existing && existing.id) {
        // Güncelle
        op = "update";
        const { data, error } = await supabase
          .from("driver_history")
          .update(payload)
          .eq("user_id", userId)
          .select()
          .single();

        result = { data, error };
      } else {
        // Ekle
        op = "insert";
        const { data, error } = await supabase
          .from("driver_history")
          .insert(payload)
          .select()
          .single();

        result = { data, error };
      }

      console.debug(`Supabase ${op} result:`, result);

      if (result.error) {
        console.error(`${op} error:`, result.error);

        // Eğer hâlâ duplicate key hatası geliyorsa, race condition ya da constraint farklı isimde olabilir
        if ((result.error.message || "").toLowerCase().includes("duplicate")) {
          toast({ title: "Kayıt Çakışması", description: "Aynı kullanıcı için zaten bir kayıt mevcut. Lütfen sayfayı yenileyip tekrar deneyin.", variant: "destructive" });
          setLoading(false);
          return;
        }

        if ((result.error.message || "").toLowerCase().includes("permission") || (result.error.details || "").toLowerCase().includes("policy")) {
          toast({ title: "İzin Hatası", description: "Veritabanı izinleri (RLS) nedeniyle işlem başarısız oldu. Supabase politika ayarlarını kontrol edin.", variant: "destructive" });
          setLoading(false);
          return;
        }

        toast({ title: "Kayıt Hatası", description: result.error.message ?? "Sürücü bilgileri kaydedilemedi", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Başarılıysa sonucu işle
      const riskLevel = calculateRiskLevel(driverData.penaltyPoints, driverData.totalAccidents, driverData.trafficViolations);
      let message = "";
      if (!isApproved) {
        if (driverData.penaltyPoints > PENALTY_THRESHOLD) message = `Ehliyet ceza puanınız (${driverData.penaltyPoints}) izin verilen maksimum değeri (${PENALTY_THRESHOLD}) aşıyor.`;
        else if (driverData.totalAccidents >= 3) message = "Kaza geçmişiniz nedeniyle kiralama yapılamıyor.";
        else if (driverScore < 60) message = `Sürücü puanınız (${driverScore}) kiralama için yeterli değil (minimum 60).`;
        else message = "Sürücü doğrulaması tamamlanamadı.";
      } else message = "Sürücü doğrulaması başarılı!";

      setVerificationResult({ isApproved, riskLevel, message });
      onVerified(isApproved, riskLevel);

      toast({ title: isApproved ? "Doğrulama Başarılı" : "Doğrulama Başarısız", description: message, variant: isApproved ? "default" : "destructive" });
    } catch (err: any) {
      console.error("Unhandled hata:", err);
      toast({ title: "Beklenmeyen hata", description: err?.message ?? String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <CardTitle>Sürücü Geçmişi Kontrolü</CardTitle>
        </div>
        <CardDescription>Güvenli kiralama için sürücü bilgilerinizi doğrulamamız gerekiyor</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">Ehliyet Numarası</Label>
            <Input id="licenseNumber" placeholder="Ehliyet numaranızı girin" value={driverData.licenseNumber} onChange={(e) => setDriverData({ ...driverData, licenseNumber: e.target.value })} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="penaltyPoints">Ehliyet Ceza Puanı (Maksimum: {PENALTY_THRESHOLD})</Label>
            <Input id="penaltyPoints" type="number" min="0" placeholder="Toplam ceza puanınız" value={driverData.penaltyPoints ?? ""} onChange={(e) => setDriverData({ ...driverData, penaltyPoints: Number.isNaN(parseInt(e.target.value, 10)) ? 0 : parseInt(e.target.value, 10) })} required />
            {driverData.penaltyPoints > PENALTY_THRESHOLD && (<p className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="w-4 h-4" />Ceza puanınız izin verilen maksimum değeri aşıyor</p>)}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalAccidents">Toplam Kaza Sayısı</Label>
              <Input id="totalAccidents" type="number" min="0" placeholder="0" value={driverData.totalAccidents ?? ""} onChange={(e) => setDriverData({ ...driverData, totalAccidents: Number.isNaN(parseInt(e.target.value, 10)) ? 0 : parseInt(e.target.value, 10) })} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trafficViolations">Trafik İhlali Sayısı</Label>
              <Input id="trafficViolations" type="number" min="0" placeholder="0" value={driverData.trafficViolations ?? ""} onChange={(e) => setDriverData({ ...driverData, trafficViolations: Number.isNaN(parseInt(e.target.value, 10)) ? 0 : parseInt(e.target.value, 10) })} required />
            </div>
          </div>

          {verificationResult && (
            <div className={`p-4 rounded-lg border ${verificationResult.isApproved ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"}`}>
              <div className="flex items-start gap-3">
                {verificationResult.isApproved ? (<CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />) : (<AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />)}
                <div className="flex-1">
                  <p className="font-semibold mb-1">{verificationResult.isApproved ? "Doğrulama Başarılı" : "Doğrulama Başarısız"}</p>
                  <p className="text-sm text-muted-foreground mb-2">{verificationResult.message}</p>
                  <Badge variant={verificationResult.riskLevel === "low" ? "default" : verificationResult.riskLevel === "medium" ? "secondary" : "destructive"}>
                    Risk Seviyesi: {verificationResult.riskLevel === "low" ? "Düşük" : verificationResult.riskLevel === "medium" ? "Orta" : "Yüksek"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Doğrulanıyor..." : "Sürücü Bilgilerini Doğrula"}</Button>
        </form>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground"><strong>Not:</strong> Güvenli kiralama için ehliyet ceza puanınız {PENALTY_THRESHOLD} puanın altında veya eşit olmalıdır. Sürücü puanı en az 60 olmalıdır.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverHistoryForm;
