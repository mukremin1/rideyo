import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Shield, AlertTriangle, CheckCircle, Loader2, Search, XCircle, Info, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "./ui/progress";
import { readIdCard, stopIdCardReading, type EidCardData } from "@/lib/eidReader";
import { useAuth } from "@/hooks/useAuth";
import {
  cardDataFromStored,
  isoToYymmdd,
  readStoredIdentity,
  saveLivenessVerification,
  saveNfcVerification,
  yymmddToIso,
} from "@/lib/identityVerification";
import { DEFAULT_DRIVER_SCORE } from "@/lib/driverScore";
import { persistDriverLicenseRecord } from "@/lib/driverHistory";
import {
  buildLicenseFailureResult,
  buildLicenseSuccessResult,
  evaluateLicenseNumber,
  type LicenseVerificationResult,
} from "@/lib/licenseVerification";

type FlowStep = "nfc" | "liveness" | "license";

const stepOrder: FlowStep[] = ["nfc", "liveness", "license"];

const resolveInitialStep = (meta: ReturnType<typeof readStoredIdentity>): FlowStep => {
  if (meta.livenessVerified) return "license";
  if (meta.nfcVerified) return "liveness";
  return "nfc";
};
const ActiveLivenessCheckDialog = lazy(() => import("./ActiveLivenessCheckDialog"));

interface AutoLicenseVerificationProps {
  userId: string;
  onVerified: (isApproved: boolean, riskLevel: string, nationalId?: string) => void;
}

const AutoLicenseVerification = ({ userId, onVerified }: AutoLicenseVerificationProps) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const stored = readStoredIdentity(user?.user_metadata as Record<string, unknown> | undefined);

  // MRZ input — dates hidden after first successful scan (stored in profile)
  const [docNumber, setDocNumber]     = useState(stored.docNumber ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(stored.dobYymmdd ? yymmddToIso(stored.dobYymmdd) : "");
  const [dateOfExpiry, setDateOfExpiry] = useState(stored.expYymmdd ? yymmddToIso(stored.expYymmdd) : "");

  const hasStoredDates = Boolean(
    (stored.dobYymmdd && stored.expYymmdd) || (dateOfBirth && dateOfExpiry),
  );

  const [licenseNumber, setLicenseNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState<"idle" | "checking" | "complete">("idle");
  const [result, setResult] = useState<LicenseVerificationResult | null>(null);

  // NFC / eID state
  const [nfcStatus, setNfcStatus] = useState<"idle" | "scanning" | "verified" | "error" | "unsupported">(
    stored.nfcVerified ? "verified" : "idle",
  );
  const [nfcError, setNfcError]   = useState<string | null>(null);
  const [cardData, setCardData]   = useState<EidCardData | null>(() => cardDataFromStored(stored));
  const nfcActiveRef = useRef(false);

  // Liveness state
  const [livenessStatus, setLivenessStatus] = useState<"idle" | "checking" | "verified" | "error" | "unsupported">(
    stored.livenessVerified ? "verified" : "idle",
  );
  const [livenessError, setLivenessError]   = useState<string | null>(null);
  const [livenessDialogOpen, setLivenessDialogOpen] = useState(false);
  const livenessDoneRef = useRef(stored.livenessVerified);
  const licenseSectionRef = useRef<HTMLDivElement | null>(null);

  const [flowStep, setFlowStep] = useState<FlowStep>(() => resolveInitialStep(stored));

  useEffect(() => {
    return () => {
      if (nfcActiveRef.current) void stopIdCardReading();
    };
  }, []);

  useEffect(() => {
    if (!user?.user_metadata) return;
    const meta = readStoredIdentity(user.user_metadata as Record<string, unknown>);
    if (meta.docNumber) setDocNumber(meta.docNumber);
    if (meta.dobYymmdd) setDateOfBirth(yymmddToIso(meta.dobYymmdd));
    if (meta.expYymmdd) setDateOfExpiry(yymmddToIso(meta.expYymmdd));
    if (meta.nfcVerified) {
      setNfcStatus("verified");
      setCardData(cardDataFromStored(meta));
    }
    if (meta.livenessVerified) {
      setLivenessStatus("verified");
      livenessDoneRef.current = true;
      setFlowStep((prev) => (stepOrder.indexOf(prev) < stepOrder.indexOf("license") ? "license" : prev));
    } else if (meta.nfcVerified) {
      setFlowStep((prev) => (prev === "nfc" ? "liveness" : prev));
    }
  }, [user?.user_metadata]);

  const goToLicenseStep = () => {
    setFlowStep("license");
    requestAnimationFrame(() => {
      licenseSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return true;
    try {
      const { Camera } = await import("@capacitor/camera");
      const status = await Camera.requestPermissions({ permissions: ["camera"] });
      return status.camera === "granted" || status.camera === "limited";
    } catch {
      return true;
    }
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleIdCardScan = async () => {
    const meta = readStoredIdentity(user?.user_metadata as Record<string, unknown> | undefined);
    const docClean = docNumber.trim().toUpperCase().replace(/[\s\-\.]/g, "");
    const dobForBac = meta.dobYymmdd ?? isoToYymmdd(dateOfBirth);
    const expForBac = meta.expYymmdd ?? isoToYymmdd(dateOfExpiry);

    if (!docClean) {
      toast({
        title: "Seri Numarası Gerekli",
        description: "Kimlik kartı seri numarasını girin.",
        variant: "destructive",
      });
      return;
    }

    if (!hasStoredDates && (!dobForBac || !expForBac)) {
      toast({
        title: "İlk Doğrulama — Tarihler Gerekli",
        description: "İlk kez okutuyorsanız doğum ve son geçerlilik tarihini de girin (bir kez kaydedilir).",
        variant: "destructive",
      });
      return;
    }
    console.log("[EidReader] BAC giriş verileri:", { doc: docClean, dob: dobForBac, exp: expForBac });

    setNfcError(null);
    setCardData(null);
    if (!livenessDoneRef.current && !stored.livenessVerified) {
      setLivenessStatus("idle");
      setLivenessError(null);
    }
    setNfcStatus("scanning");
    nfcActiveRef.current = true;

    try {
      const result = await readIdCard({
        docNumber: docClean,
        dateOfBirth: dobForBac,
        dateOfExpiry: expForBac,
      });

      if (!result.ok) {
        if (result.reason === "unsupported") {
          setNfcStatus("unsupported");
          toast({ title: "Desteklenmiyor", description: result.errorMessage, variant: "destructive" });
          return;
        }
        if (result.reason === "cancelled") {
          setNfcStatus("idle");
          return;
        }
        setNfcStatus("error");
        setNfcError(result.errorMessage);
        toast({ title: "Kimlik Okuma Hatası", description: result.errorMessage, variant: "destructive" });
        return;
      }

      setCardData(result.data);
      setNfcStatus("verified");

      const saveResult = await saveNfcVerification(userId, result.data, {
        docNumber: docClean,
        dateOfBirth: dobForBac,
        dateOfExpiry: expForBac,
      });
      if (saveResult.error) {
        toast({ title: "Kayıt uyarısı", description: saveResult.error, variant: "destructive" });
      }

      // Auto-proceed to liveness
      if (!livenessDoneRef.current && !stored.livenessVerified) {
        setFlowStep("liveness");
        setLivenessError(null);
        const camOk = await requestCameraPermission();
        if (!camOk) {
          setLivenessStatus("error");
          setLivenessError("Kamera izni gerekli. Ayarlardan izin verin.");
          return;
        }
        livenessDoneRef.current = false;
        setLivenessStatus("checking");
        setLivenessDialogOpen(true);
      } else {
        goToLicenseStep();
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Kimlik okuma başlatılamadı.";
      setNfcStatus("error");
      setNfcError(msg);
      toast({ title: "Kimlik Okuma Hatası", description: msg, variant: "destructive" });
    } finally {
      nfcActiveRef.current = false;
    }
  };

  const handleLivenessCheck = async () => {
    if (nfcStatus !== "verified") {
      toast({
        title: "Kimlik Doğrulaması Gerekli",
        description: "Canlılık adımına geçmek için önce kimlik kartını okutun.",
        variant: "destructive",
      });
      return;
    }
    const camOk = await requestCameraPermission();
    if (!camOk) {
      setLivenessStatus("error");
      setLivenessError("Kamera izni gerekli. Ayarlardan izin verin.");
      toast({ title: "Kamera İzni", description: "Canlılık kontrolü için kamera izni verin.", variant: "destructive" });
      return;
    }
    setLivenessError(null);
    livenessDoneRef.current = false;
    setFlowStep("liveness");
    setLivenessStatus("checking");
    setLivenessDialogOpen(true);
  };

  const persistLicenseRecord = async (): Promise<boolean> => {
    const result = await persistDriverLicenseRecord(userId, licenseNumber, {
      nationalId: cardData?.nationalId,
      surname: cardData?.surname,
      givenNames: cardData?.givenNames,
    });
    if (!result.ok) {
      toast({
        title: "Ehliyet kaydı kaydedilemedi",
        description: result.error ?? "Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    }
    return result.ok;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (nfcStatus !== "verified") {
      toast({ title: "Kimlik Doğrulaması Gerekli", description: "Önce kimlik kartını okutun.", variant: "destructive" });
      return;
    }
    if (livenessStatus !== "verified") {
      toast({ title: "Canlılık Kontrolü Gerekli", description: "Canlılık adımını tamamlayın.", variant: "destructive" });
      return;
    }
    if (!licenseNumber.trim()) {
      toast({ title: "Ehliyet Numarası Gerekli", description: "Lütfen ehliyet numaranızı girin.", variant: "destructive" });
      return;
    }
    if (!userId) {
      toast({ title: "Giriş Gerekli", description: "Ehliyet doğrulaması için giriş yapmalısınız.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setVerificationStep("checking");
    setResult(null);

    try {
      const localCheck = evaluateLicenseNumber(licenseNumber);
      if (!localCheck.approved) {
        const failure = buildLicenseFailureResult(localCheck.message, localCheck.reason);
        setResult(failure);
        setVerificationStep("complete");
        return;
      }

      const normalized = buildLicenseSuccessResult(localCheck.message);
      const saved = await persistLicenseRecord();
      if (!saved) {
        setVerificationStep("idle");
        return;
      }
      setResult(normalized);
      setVerificationStep("complete");
      onVerified(true, "low", cardData?.nationalId);
    } catch (error: unknown) {
      setVerificationStep("idle");
      let errorMessage = "Ehliyet doğrulama sırasında bir hata oluştu";
      if (error instanceof Error && error.message) {
        try { errorMessage = JSON.parse(error.message).error || errorMessage; } catch { errorMessage = error.message; }
      }
      toast({ title: "Doğrulama Hatası", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Render helpers ───────────────────────────────────────────────────────────

  const getScoreColor = (score: number) =>
    score >= 80 ? "text-green-500" : score >= 60 ? "text-yellow-500" : "text-red-500";

  const displayScore = DEFAULT_DRIVER_SCORE;

  // ── UI ───────────────────────────────────────────────────────────────────────

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <CardTitle>Otomatik Ehliyet Doğrulama</CardTitle>
        </div>
        <CardDescription>
          Sırayla: kimlik kartı NFC → canlılık → ehliyet numarası.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Tamamlanan adımlar özeti */}
        {(flowStep === "liveness" || flowStep === "license") && nfcStatus === "verified" && cardData && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <span>
              Kimlik okundu: {cardData.surname} {cardData.givenNames} · TC: {cardData.nationalId}
            </span>
          </div>
        )}
        {flowStep === "license" && livenessStatus === "verified" && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <span>Canlılık kontrolü tamamlandı</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-5">

          {/* ── Adım 1–2: NFC (sadece nfc adımında) ─────────────────────── */}
          {flowStep === "nfc" && (
            <>
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Adım 1 — Kimlik Kartı Bilgileri
            </Label>
            <p className="text-xs text-muted-foreground">
              {hasStoredDates
                ? "Daha önce kaydedilen tarihler kullanılacak — sadece seri numarasını kontrol edip kartı okutun."
                : "İlk doğrulamada MRZ tarihleri de gerekir; bir kez kaydedilir, sonraki girişlerde sorulmaz."}
            </p>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label htmlFor="docNumber" className="text-sm">Kimlik Seri Numarası</Label>
                <Input
                  id="docNumber"
                  placeholder="Örn: A01B23456"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  onBlur={(e) => setDocNumber(e.target.value.trim().toUpperCase())}
                  disabled={loading || nfcStatus === "scanning"}
                  maxLength={12}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">
                  Kartın <strong>ön yüzündeki seri numarası</strong> — boşluksuz, büyük harf.
                </p>
              </div>

              {!hasStoredDates && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="dob" className="text-sm">Doğum Tarihi</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      disabled={loading || nfcStatus === "scanning"}
                      max={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="expiry" className="text-sm">Son Geçerlilik</Label>
                    <Input
                      id="expiry"
                      type="date"
                      value={dateOfExpiry}
                      onChange={(e) => setDateOfExpiry(e.target.value)}
                      disabled={loading || nfcStatus === "scanning"}
                      min={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── BAC özet (debug) ──────────────────────────────────────────── */}
          {!hasStoredDates && docNumber && dateOfBirth && dateOfExpiry && (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium">NFC için kullanılacak değerler:</p>
              <p>Seri: <span className="font-mono font-bold text-foreground">{docNumber.trim().toUpperCase().replace(/[\s\-\.]/g, "")}</span></p>
              <p>Doğum (YYAAGG): <span className="font-mono font-bold text-foreground">{isoToYymmdd(dateOfBirth)}</span></p>
              <p>Geçerlilik (YYAAGG): <span className="font-mono font-bold text-foreground">{isoToYymmdd(dateOfExpiry)}</span></p>
            </div>
          )}

          {/* ── Step 2: NFC / eID scan ────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Adım 2 — Kimlik Kartı NFC Okuma</Label>
            <div className="rounded-lg border border-border bg-background/50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {nfcStatus === "verified" && cardData ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-600">Kimlik kartı okundu</p>
                      <p className="text-xs text-muted-foreground">
                        {cardData.surname} {cardData.givenNames} · TC: {cardData.nationalId}
                      </p>
                    </div>
                  </>
                ) : nfcStatus === "scanning" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                    <span>Kimlik kartını telefonunuza yaklaştırın…</span>
                  </>
                ) : nfcStatus === "unsupported" ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span>NFC bu cihazda desteklenmiyor.</span>
                  </>
                ) : nfcStatus === "error" ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                    <span className="text-sm">{nfcError ?? "Kart okuma başarısız."}</span>
                  </>
                ) : (
                  <>
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <span>Bilgileri girdikten sonra kimlik kartını okutun.</span>
                  </>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleIdCardScan}
                disabled={loading || nfcStatus === "scanning" || nfcStatus === "verified"}
              >
                {nfcStatus === "verified" ? "Kimlik Doğrulandı ✓" :
                 nfcStatus === "scanning"  ? "Kart Bekleniyor…"   : "Kimlik Kartını Okut"}
              </Button>
            </div>
          </div>
            </>
          )}

          {/* ── Adım 3: Canlılık (nfc bittikten sonra) ───────────────────── */}
          {flowStep === "liveness" && (
          <div className="space-y-2">
            <Label className="text-base font-medium">Canlılık Kontrolü</Label>
            <div className="rounded-lg border border-border bg-background/50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {livenessStatus === "verified" ? (
                  <><CheckCircle className="w-4 h-4 text-green-500" /><span>Canlılık kontrolü tamamlandı</span></>
                ) : livenessStatus === "checking" ? (
                  <><Loader2 className="w-4 h-4 animate-spin text-primary" /><span>Selfie kontrolü başlatıldı</span></>
                ) : livenessStatus === "error" ? (
                  <><AlertTriangle className="w-4 h-4 text-destructive" /><span>{livenessError ?? "Canlılık kontrolü başarısız"}</span></>
                ) : (
                  <><Info className="w-4 h-4 text-muted-foreground" /><span>Kimlik okunduktan sonra otomatik başlar.</span></>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleLivenessCheck}
                disabled={loading || livenessStatus === "checking" || nfcStatus !== "verified"}
              >
                {livenessStatus === "verified" ? "Canlılık Doğrulandı ✓" : "Canlılık Kontrolü Yap"}
              </Button>
            </div>
          </div>
          )}

          {/* ── Adım 4: Ehliyet (canlılık bittikten sonra) ───────────────── */}
          {flowStep === "license" && (
          <div ref={licenseSectionRef} className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              Son adım: ehliyet numaranızı girin ve doğrulamayı gönderin.
            </div>
          <div className="space-y-2">
            <Label htmlFor="licenseNumber" className="text-base font-medium">Ehliyet Numarası</Label>
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
            <p className="text-xs text-muted-foreground">Ehliyetin ön yüzündeki numarayı girin</p>
          </div>
          {verificationStep === "checking" && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="font-medium">Ehliyet Doğrulanıyor…</span>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /><span>Format kontrolü yapılıyor</span></div>
                <div className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /><span>Trafik kayıtları sorgulanıyor</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3" /><span className="opacity-50">Risk analizi yapılıyor</span></div>
              </div>
            </div>
          )}

          {/* ── Result ────────────────────────────────────────────────────── */}
          {verificationStep === "complete" && result && (
            <div className={`p-4 rounded-lg border ${result.canRent ? "bg-green-500/5 border-green-500/20" : "bg-destructive/5 border-destructive/20"}`}>
              <div className="flex items-start gap-3">
                {result.canRent
                  ? <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold text-lg">{result.canRent ? "Ehliyet Onaylandı" : "Ehliyet Reddedildi"}</p>
                    <p className="text-sm text-muted-foreground">{result.message || result.error}</p>
                  </div>
                  {result.canRent && (
                    <div className="bg-background/50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Sürücü Puanı</span>
                        <span className={`text-2xl font-bold ${getScoreColor(displayScore)}`}>{displayScore}</span>
                      </div>
                      <Progress value={displayScore} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Her sürücü 100 puan ile başlar. Puanınız kullanımınıza göre güncellenir.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


          <Button
            type="submit"
            className="w-full"
            disabled={loading || nfcStatus !== "verified" || livenessStatus !== "verified"}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Doğrulanıyor…</>
            ) : verificationStep === "complete" ? "Tekrar Doğrula" : (
              <><Search className="w-4 h-4 mr-2" />Ehliyeti Doğrula</>
            )}
          </Button>
          </div>
          )}
        </form>

        <Suspense fallback={null}>
          <ActiveLivenessCheckDialog
            open={livenessDialogOpen}
            onOpenChange={(next) => {
              setLivenessDialogOpen(next);
              if (!next && !livenessDoneRef.current) {
                setLivenessStatus("error");
                setLivenessError("Canlılık kontrolü tamamlanmadı.");
              }
            }}
            onSuccess={async () => {
              livenessDoneRef.current = true;
              setLivenessStatus("verified");
              setLivenessError(null);
              const saveResult = await saveLivenessVerification(userId);
              if (saveResult.error) {
                toast({ title: "Kayıt uyarısı", description: saveResult.error, variant: "destructive" });
              }
              goToLicenseStep();
            }}
            onFailure={(message) => {
              setLivenessStatus(message.toLowerCase().includes("desteklenmiyor") ? "unsupported" : "error");
              setLivenessError(message);
              toast({ title: "Canlılık Kontrolü Başarısız", description: message, variant: "destructive" });
            }}
          />
        </Suspense>
      </CardContent>
    </Card>
  );
};

export default AutoLicenseVerification;
