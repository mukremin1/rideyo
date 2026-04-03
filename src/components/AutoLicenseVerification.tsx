import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Shield, AlertTriangle, CheckCircle, Loader2, Search, XCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "./ui/progress";

interface AutoLicenseVerificationProps {
  userId: string;
  onVerified: (isApproved: boolean, riskLevel: string) => void;
}

interface VerificationResult {
  success: boolean;
  canRent: boolean;
  message: string;
  error?: string;
  reason?: string;
  data?: {
    driverScore: number;
    riskLevel: string;
    penaltyPoints: number;
    trafficViolations: number;
    totalAccidents: number;
    expiryDate?: string;
    licenseClass?: string;
    isApproved: boolean;
    verificationStatus: string;
  };
}

const AutoLicenseVerification = ({ userId, onVerified }: AutoLicenseVerificationProps) => {
  const { toast } = useToast();
  const [licenseNumber, setLicenseNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState<"idle" | "checking" | "complete">("idle");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [nfcStatus, setNfcStatus] = useState<"idle" | "scanning" | "verified" | "error" | "unsupported">("idle");
  const [nfcError, setNfcError] = useState<string | null>(null);

  const handleNfcScan = async () => {
    setNfcError(null);

    try {
      if (!("NDEFReader" in window)) {
        setNfcStatus("unsupported");
        toast({
          title: "NFC Desteklenmiyor",
          description: "Cihaziniz NFC okumayi desteklemiyor. Mobil cihaz ile deneyin.",
          variant: "destructive",
        });
        return;
      }

      setNfcStatus("scanning");
      const reader = new (window as any).NDEFReader();

      await reader.scan();

      reader.onreading = () => {
        setNfcStatus("verified");
        toast({
          title: "NFC Dogrulama Basarili",
          description: "Kimlik bilgisi okundu.",
        });
      };

      reader.onreadingerror = () => {
        setNfcStatus("error");
        setNfcError("NFC okuma basarisiz oldu. Tekrar deneyin.");
        toast({
          title: "NFC Okuma Hatasi",
          description: "Kart okunamadi. Telefonu yaklastirip tekrar deneyin.",
          variant: "destructive",
        });
      };
    } catch (error: any) {
      setNfcStatus("error");
      setNfcError(error?.message ?? "NFC dogrulama baslatilamadi.");
      toast({
        title: "NFC Dogrulama Hatasi",
        description: error?.message ?? "NFC dogrulama baslatilamadi.",
        variant: "destructive",
      });
    }
  };

  const persistLicenseRecord = async (verification: VerificationResult) => {
    if (!userId || !licenseNumber.trim()) return;

    const payload = {
      user_id: userId,
      license_number: licenseNumber.trim(),
      penalty_points: verification.data?.penaltyPoints ?? 0,
      total_accidents: verification.data?.totalAccidents ?? 0,
      traffic_violations: verification.data?.trafficViolations ?? 0,
      driver_score: verification.data?.driverScore ?? null,
      is_approved: verification.data?.isApproved ?? verification.canRent,
      verification_status: verification.data?.verificationStatus ?? (verification.canRent ? "verified" : "rejected"),
    };

    const { data: existing, error: selectError } = await supabase
      .from("driver_history")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (selectError) {
      toast({
        title: "Ehliyet kaydı alınamadı",
        description: selectError.message ?? "Kayıt kontrol edilemedi",
        variant: "destructive",
      });
      return;
    }

    if (existing?.id) {
      const { error } = await supabase
        .from("driver_history")
        .update(payload)
        .eq("user_id", userId);

      if (error) {
        toast({
          title: "Ehliyet kaydı güncellenemedi",
          description: error.message ?? "Güncelleme sırasında hata oluştu",
          variant: "destructive",
        });
      }
      return;
    }

    const { error } = await supabase.from("driver_history").insert(payload);
    if (error) {
      toast({
        title: "Ehliyet kaydı oluşturulamadı",
        description: error.message ?? "Kayıt sırasında hata oluştu",
        variant: "destructive",
      });
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (nfcStatus !== "verified") {
      toast({
        title: "NFC Dogrulamasi Gerekli",
        description: "Kimlik dogrulamasi icin once NFC okuma yapin.",
        variant: "destructive",
      });
      return;
    }
    
    if (!licenseNumber.trim()) {
      toast({
        title: "Ehliyet Numarası Gerekli",
        description: "Lütfen ehliyet numaranızı girin",
        variant: "destructive",
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Giriş Gerekli",
        description: "Ehliyet doğrulaması için giriş yapmalısınız",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setVerificationStep("checking");
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-license', {
        body: { licenseNumber, userId }
      });

      if (error) {
        throw error;
      }

      setResult(data as VerificationResult);
      await persistLicenseRecord(data as VerificationResult);
      setVerificationStep("complete");

      if (data.success && data.canRent) {
        toast({
          title: "Doğrulama Başarılı",
          description: data.message,
        });
        onVerified(true, data.data?.riskLevel || "low");
      } else {
        toast({
          title: "Doğrulama Başarısız",
          description: data.error || data.message || "Ehliyet doğrulanamadı",
          variant: "destructive",
        });
        onVerified(false, data.data?.riskLevel || "high");
      }
    } catch (error: any) {
      console.error("License verification error:", error);
      setVerificationStep("idle");
      
      // Parse error response if available
      let errorMessage = "Ehliyet doğrulama sırasında bir hata oluştu";
      if (error.message) {
        try {
          const parsed = JSON.parse(error.message);
          errorMessage = parsed.error || errorMessage;
        } catch {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Doğrulama Hatası",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return <Badge className="bg-green-500">Düşük Risk</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500">Orta Risk</Badge>;
      case "high":
        return <Badge variant="destructive">Yüksek Risk</Badge>;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <CardTitle>Otomatik Ehliyet Doğrulama</CardTitle>
        </div>
        <CardDescription>
          Ehliyet numaranızı girin, sistem otomatik olarak sürücü bilgilerinizi kontrol edecektir
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nfcVerification">NFC ile Kimlik Dogrulama</Label>
            <div className="rounded-lg border border-border bg-background/50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {nfcStatus === "verified" ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>NFC dogrulamasi tamamlandi</span>
                  </>
                ) : nfcStatus === "scanning" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>NFC taramasi baslatildi, karti yaklastirin</span>
                  </>
                ) : nfcStatus === "unsupported" ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span>NFC desteklenmiyor. Mobil cihaz ile deneyin</span>
                  </>
                ) : nfcStatus === "error" ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span>{nfcError ?? "NFC okuma basarisiz"}</span>
                  </>
                ) : (
                  <>
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <span>NFC ile kimlik dogrulamasi yapin</span>
                  </>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleNfcScan}
                disabled={loading || nfcStatus === "scanning" || nfcStatus === "verified"}
              >
                {nfcStatus === "verified" ? "NFC Dogrulandi" : "NFC ile Dogrula"}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">Ehliyet Numarası</Label>
            <div className="relative">
              <Input
                id="licenseNumber"
                placeholder="Örn: 12345678901"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                className="pr-10"
                disabled={loading}
                required
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Ehliyetinizin ön yüzünde bulunan numarayı girin
            </p>
          </div>

          {/* Verification Progress */}
          {verificationStep === "checking" && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="font-medium">Ehliyet Doğrulanıyor...</span>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Format kontrolü yapılıyor</span>
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Trafik kayıtları sorgulanıyor</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3" />
                  <span className="text-muted-foreground/50">Risk analizi yapılıyor</span>
                </div>
              </div>
            </div>
          )}

          {/* Verification Result */}
          {verificationStep === "complete" && result && (
            <div className={`p-4 rounded-lg border ${
              result.canRent 
                ? "bg-green-500/5 border-green-500/20" 
                : "bg-destructive/5 border-destructive/20"
            }`}>
              <div className="flex items-start gap-3">
                {result.canRent ? (
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold text-lg">
                      {result.canRent ? "Ehliyet Onaylandı" : "Ehliyet Reddedildi"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.message || result.error}
                    </p>
                  </div>

                  {result.data && (
                    <>
                      <div className="flex items-center gap-2">
                        {getRiskBadge(result.data.riskLevel)}
                        {result.data.licenseClass && (
                          <Badge variant="outline">Sınıf: {result.data.licenseClass}</Badge>
                        )}
                      </div>

                      {/* Driver Score */}
                      <div className="bg-background/50 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Sürücü Puanı</span>
                          <span className={`text-2xl font-bold ${getScoreColor(result.data.driverScore)}`}>
                            {result.data.driverScore}
                          </span>
                        </div>
                        <Progress value={result.data.driverScore} className="h-2" />
                      </div>

                      {/* Statistics */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-background/50 rounded p-2">
                          <p className="text-lg font-bold">{result.data.penaltyPoints}</p>
                          <p className="text-xs text-muted-foreground">Ceza Puanı</p>
                        </div>
                        <div className="bg-background/50 rounded p-2">
                          <p className="text-lg font-bold">{result.data.trafficViolations}</p>
                          <p className="text-xs text-muted-foreground">Trafik İhlali</p>
                        </div>
                        <div className="bg-background/50 rounded p-2">
                          <p className="text-lg font-bold">{result.data.totalAccidents}</p>
                          <p className="text-xs text-muted-foreground">Kaza</p>
                        </div>
                      </div>

                      {result.data.expiryDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <Info className="w-4 h-4 text-muted-foreground" />
                          <span>Ehliyet Geçerlilik: {result.data.expiryDate}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* High Risk Warning */}
          {result && !result.canRent && result.data?.riskLevel === "high" && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Kiralama Kısıtlaması</p>
                <p className="text-muted-foreground">
                  Sürücü geçmişiniz nedeniyle şu an araç kiralama hizmetimizden yararlanamazsınız. 
                  Ceza puanınız düştüğünde tekrar deneyebilirsiniz.
                </p>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading || nfcStatus !== "verified"}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Doğrulanıyor...
              </>
            ) : verificationStep === "complete" ? (
              "Tekrar Doğrula"
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Ehliyeti Doğrula
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
          <p className="text-xs text-muted-foreground">
            <strong>Doğrulama Kriterleri:</strong>
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Ehliyet süresi dolmamış olmalı</li>
            <li>Ehliyet iptal edilmemiş olmalı</li>
            <li>Ceza puanı 70'in altında olmalı</li>
            <li>Sürücü puanı en az 60 olmalı</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoLicenseVerification;
