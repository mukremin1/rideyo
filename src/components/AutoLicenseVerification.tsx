import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useTranslation, Trans } from "react-i18next";
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
import {
  buildLicenseFailureResult,
  evaluateLicenseNumber,
  type LicenseVerificationResult,
} from "@/lib/licenseVerification";
import { createSupabaseInvoker, invokeVerifyLicense } from "@/lib/serverApi";
import { supabase } from "@/integrations/supabase/client";

type FlowStep = "nfc" | "liveness" | "license";

const stepOrder: FlowStep[] = ["nfc", "liveness", "license"];

const resolveInitialStep = (meta: ReturnType<typeof readStoredIdentity>): FlowStep => {
  if (meta.livenessVerified) return "license";
  if (meta.nfcVerified) return "liveness";
  return "nfc";
};
const ActiveLivenessCheckDialog = lazy(() => import("./ActiveLivenessCheckDialog"));

const supabaseInvoke = createSupabaseInvoker((name, options) =>
  supabase.functions.invoke(name, options),
);

interface AutoLicenseVerificationProps {
  userId: string;
  onVerified: (isApproved: boolean, riskLevel: string, nationalId?: string) => void;
}

const AutoLicenseVerification = ({ userId, onVerified }: AutoLicenseVerificationProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  const stored = readStoredIdentity(user?.user_metadata as Record<string, unknown> | undefined);

  const [docNumber, setDocNumber] = useState(stored.docNumber ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(stored.dobYymmdd ? yymmddToIso(stored.dobYymmdd) : "");
  const [dateOfExpiry, setDateOfExpiry] = useState(stored.expYymmdd ? yymmddToIso(stored.expYymmdd) : "");

  const hasStoredDates = Boolean(
    (stored.dobYymmdd && stored.expYymmdd) || (dateOfBirth && dateOfExpiry),
  );

  const [licenseNumber, setLicenseNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState<"idle" | "checking" | "complete">("idle");
  const [result, setResult] = useState<LicenseVerificationResult | null>(null);

  const [nfcStatus, setNfcStatus] = useState<"idle" | "scanning" | "verified" | "error" | "unsupported">(
    stored.nfcVerified ? "verified" : "idle",
  );
  const [nfcError, setNfcError] = useState<string | null>(null);
  const [cardData, setCardData] = useState<EidCardData | null>(() => cardDataFromStored(stored));
  const nfcActiveRef = useRef(false);

  const [livenessStatus, setLivenessStatus] = useState<"idle" | "checking" | "verified" | "error" | "unsupported">(
    stored.livenessVerified ? "verified" : "idle",
  );
  const [livenessError, setLivenessError] = useState<string | null>(null);
  const [livenessDialogOpen, setLivenessDialogOpen] = useState(false);
  const livenessDoneRef = useRef(stored.livenessVerified);
  const licenseSectionRef = useRef<HTMLDivElement | null>(null);

  const [flowStep, setFlowStep] = useState<FlowStep>(() => resolveInitialStep(stored));

  const isUnsupportedMessage = (message: string) => {
    const lower = message.toLowerCase();
    return lower.includes("desteklenmiyor") || lower.includes("unsupported") || lower.includes("not supported");
  };

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

  const handleIdCardScan = async () => {
    const meta = readStoredIdentity(user?.user_metadata as Record<string, unknown> | undefined);
    const docClean = docNumber.trim().toUpperCase().replace(/[\s\-\.]/g, "");
    const dobForBac = meta.dobYymmdd ?? isoToYymmdd(dateOfBirth);
    const expForBac = meta.expYymmdd ?? isoToYymmdd(dateOfExpiry);

    if (!docClean) {
      toast({
        title: t("verification.autoLicense.toast.docNumberRequired"),
        description: t("verification.autoLicense.toast.docNumberRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    if (!hasStoredDates && (!dobForBac || !expForBac)) {
      toast({
        title: t("verification.autoLicense.toast.datesRequired"),
        description: t("verification.autoLicense.toast.datesRequiredDesc"),
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
      const scanResult = await readIdCard({
        docNumber: docClean,
        dateOfBirth: dobForBac,
        dateOfExpiry: expForBac,
      });

      if (!scanResult.ok) {
        if (scanResult.reason === "unsupported") {
          setNfcStatus("unsupported");
          toast({ title: t("verification.autoLicense.toast.unsupported"), description: scanResult.errorMessage, variant: "destructive" });
          return;
        }
        if (scanResult.reason === "cancelled") {
          setNfcStatus("idle");
          return;
        }
        setNfcStatus("error");
        setNfcError(scanResult.errorMessage);
        toast({ title: t("verification.autoLicense.toast.idReadError"), description: scanResult.errorMessage, variant: "destructive" });
        return;
      }

      setCardData(scanResult.data);
      setNfcStatus("verified");

      const saveResult = await saveNfcVerification(userId, scanResult.data, {
        docNumber: docClean,
        dateOfBirth: dobForBac,
        dateOfExpiry: expForBac,
      });
      if (saveResult.error) {
        toast({ title: t("verification.autoLicense.toast.saveWarning"), description: saveResult.error, variant: "destructive" });
      }

      if (!livenessDoneRef.current && !stored.livenessVerified) {
        setFlowStep("liveness");
        setLivenessError(null);
        const camOk = await requestCameraPermission();
        if (!camOk) {
          setLivenessStatus("error");
          setLivenessError(t("verification.autoLicense.toast.cameraPermissionRequired"));
          return;
        }
        livenessDoneRef.current = false;
        setLivenessStatus("checking");
        setLivenessDialogOpen(true);
      } else {
        goToLicenseStep();
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t("verification.autoLicense.toast.idReadStartFailed");
      setNfcStatus("error");
      setNfcError(msg);
      toast({ title: t("verification.autoLicense.toast.idReadError"), description: msg, variant: "destructive" });
    } finally {
      nfcActiveRef.current = false;
    }
  };

  const handleLivenessCheck = async () => {
    if (nfcStatus !== "verified") {
      toast({
        title: t("verification.autoLicense.toast.identityRequired"),
        description: t("verification.autoLicense.toast.identityRequiredForLiveness"),
        variant: "destructive",
      });
      return;
    }
    const camOk = await requestCameraPermission();
    if (!camOk) {
      setLivenessStatus("error");
      setLivenessError(t("verification.autoLicense.toast.cameraPermissionRequired"));
      toast({
        title: t("verification.autoLicense.toast.cameraPermissionTitle"),
        description: t("verification.autoLicense.toast.cameraPermissionDesc"),
        variant: "destructive",
      });
      return;
    }
    setLivenessError(null);
    livenessDoneRef.current = false;
    setFlowStep("liveness");
    setLivenessStatus("checking");
    setLivenessDialogOpen(true);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (nfcStatus !== "verified") {
      toast({
        title: t("verification.autoLicense.toast.identityRequired"),
        description: t("verification.autoLicense.toast.identityRequiredShort"),
        variant: "destructive",
      });
      return;
    }
    if (livenessStatus !== "verified") {
      toast({
        title: t("verification.autoLicense.toast.livenessRequired"),
        description: t("verification.autoLicense.toast.livenessRequiredDesc"),
        variant: "destructive",
      });
      return;
    }
    if (!licenseNumber.trim()) {
      toast({
        title: t("verification.autoLicense.toast.licenseRequired"),
        description: t("verification.autoLicense.toast.licenseRequiredDesc"),
        variant: "destructive",
      });
      return;
    }
    if (!userId) {
      toast({
        title: t("verification.autoLicense.toast.signInRequired"),
        description: t("verification.autoLicense.toast.signInRequiredDesc"),
        variant: "destructive",
      });
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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error(t("verification.autoLicense.toast.sessionNotFound"));
      }

      const { data: verifyData, error: verifyError } = await invokeVerifyLicense(
        {
          licenseNumber,
          userId,
          nationalId: cardData?.nationalId,
          surname: cardData?.surname,
          givenNames: cardData?.givenNames,
        },
        session.access_token,
        supabaseInvoke,
      );

      if (verifyError) throw verifyError;

      if (!verifyData?.success || verifyData?.canRent === false) {
        const failure = buildLicenseFailureResult(
          (verifyData?.error as string) || (verifyData?.message as string) || t("verification.autoLicense.toast.licenseVerifyFailed"),
          (verifyData?.reason as string) || "verification_failed",
        );
        setResult(failure);
        setVerificationStep("complete");
        return;
      }

      const normalized: LicenseVerificationResult = {
        success: true,
        canRent: true,
        message: (verifyData.message as string) || localCheck.message,
        data: verifyData.data as LicenseVerificationResult["data"],
      };

      setResult(normalized);
      setVerificationStep("complete");
      onVerified(true, "low", cardData?.nationalId);
    } catch (error: unknown) {
      setVerificationStep("idle");
      let errorMessage = t("verification.autoLicense.toast.verifyErrorGeneric");
      if (error instanceof Error && error.message) {
        try { errorMessage = JSON.parse(error.message).error || errorMessage; } catch { errorMessage = error.message; }
      }
      toast({ title: t("verification.autoLicense.toast.verifyError"), description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) =>
    score >= 80 ? "text-green-500" : score >= 60 ? "text-yellow-500" : "text-red-500";

  const displayScore = DEFAULT_DRIVER_SCORE;

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <CardTitle>{t("verification.autoLicense.title")}</CardTitle>
        </div>
        <CardDescription>
          {t("verification.autoLicense.description")}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {(flowStep === "liveness" || flowStep === "license") && nfcStatus === "verified" && cardData && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <span>
              {t("verification.autoLicense.identityReadSummary", {
                surname: cardData.surname,
                givenNames: cardData.givenNames,
                nationalId: cardData.nationalId,
              })}
            </span>
          </div>
        )}
        {flowStep === "license" && livenessStatus === "verified" && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <span>{t("verification.autoLicense.livenessCompleteSummary")}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-5">

          {flowStep === "nfc" && (
            <>
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> {t("verification.autoLicense.step1Title")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {hasStoredDates
                ? t("verification.autoLicense.storedDatesHint")
                : t("verification.autoLicense.firstTimeDatesHint")}
            </p>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label htmlFor="docNumber" className="text-sm">{t("verification.autoLicense.docNumberLabel")}</Label>
                <Input
                  id="docNumber"
                  placeholder={t("verification.autoLicense.docNumberPlaceholder")}
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
                  <Trans
                    i18nKey="verification.autoLicense.docNumberHelp"
                    components={{ strong: <strong /> }}
                  />
                </p>
              </div>

              {!hasStoredDates && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="dob" className="text-sm">{t("verification.autoLicense.dateOfBirth")}</Label>
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
                    <Label htmlFor="expiry" className="text-sm">{t("verification.autoLicense.dateOfExpiry")}</Label>
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

          {!hasStoredDates && docNumber && dateOfBirth && dateOfExpiry && (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium">{t("verification.autoLicense.bacPreviewTitle")}</p>
              <p>{t("verification.autoLicense.bacSerial")} <span className="font-mono font-bold text-foreground">{docNumber.trim().toUpperCase().replace(/[\s\-\.]/g, "")}</span></p>
              <p>{t("verification.autoLicense.bacDob")} <span className="font-mono font-bold text-foreground">{isoToYymmdd(dateOfBirth)}</span></p>
              <p>{t("verification.autoLicense.bacExpiry")} <span className="font-mono font-bold text-foreground">{isoToYymmdd(dateOfExpiry)}</span></p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-base font-medium">{t("verification.autoLicense.step2Title")}</Label>
            <div className="rounded-lg border border-border bg-background/50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {nfcStatus === "verified" && cardData ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-600">{t("verification.autoLicense.nfcCardRead")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("verification.autoLicense.nfcCardReadDetail", {
                          surname: cardData.surname,
                          givenNames: cardData.givenNames,
                          nationalId: cardData.nationalId,
                        })}
                      </p>
                    </div>
                  </>
                ) : nfcStatus === "scanning" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                    <span>{t("verification.autoLicense.nfcScanning")}</span>
                  </>
                ) : nfcStatus === "unsupported" ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span>{t("verification.autoLicense.nfcUnsupported")}</span>
                  </>
                ) : nfcStatus === "error" ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                    <span className="text-sm">{nfcError ?? t("verification.autoLicense.nfcErrorFallback")}</span>
                  </>
                ) : (
                  <>
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <span>{t("verification.autoLicense.nfcIdleHint")}</span>
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
                {nfcStatus === "verified" ? t("verification.autoLicense.nfcVerifiedButton") :
                 nfcStatus === "scanning"  ? t("verification.autoLicense.nfcScanningButton")   : t("verification.autoLicense.nfcScanButton")}
              </Button>
            </div>
          </div>
            </>
          )}

          {flowStep === "liveness" && (
          <div className="space-y-2">
            <Label className="text-base font-medium">{t("verification.autoLicense.livenessStepTitle")}</Label>
            <div className="rounded-lg border border-border bg-background/50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {livenessStatus === "verified" ? (
                  <><CheckCircle className="w-4 h-4 text-green-500" /><span>{t("verification.autoLicense.livenessVerified")}</span></>
                ) : livenessStatus === "checking" ? (
                  <><Loader2 className="w-4 h-4 animate-spin text-primary" /><span>{t("verification.autoLicense.livenessChecking")}</span></>
                ) : livenessStatus === "error" ? (
                  <><AlertTriangle className="w-4 h-4 text-destructive" /><span>{livenessError ?? t("verification.autoLicense.livenessErrorFallback")}</span></>
                ) : (
                  <><Info className="w-4 h-4 text-muted-foreground" /><span>{t("verification.autoLicense.livenessIdleHint")}</span></>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleLivenessCheck}
                disabled={loading || livenessStatus === "checking" || nfcStatus !== "verified"}
              >
                {livenessStatus === "verified" ? t("verification.autoLicense.livenessVerifiedButton") : t("verification.autoLicense.livenessStartButton")}
              </Button>
            </div>
          </div>
          )}

          {flowStep === "license" && (
          <div ref={licenseSectionRef} className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              {t("verification.autoLicense.licenseFinalHint")}
            </div>
          <div className="space-y-2">
            <Label htmlFor="licenseNumber" className="text-base font-medium">{t("verification.autoLicense.licenseNumberLabel")}</Label>
            <div className="relative">
              <Input
                id="licenseNumber"
                placeholder={t("verification.autoLicense.licenseNumberPlaceholder")}
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                className="pr-10"
                disabled={loading}
                required
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">{t("verification.autoLicense.licenseNumberHelp")}</p>
          </div>
          {verificationStep === "checking" && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="font-medium">{t("verification.autoLicense.licenseChecking")}</span>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /><span>{t("verification.autoLicense.checkFormat")}</span></div>
                <div className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /><span>{t("verification.autoLicense.checkTrafficRecords")}</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3" /><span className="opacity-50">{t("verification.autoLicense.checkRiskAnalysis")}</span></div>
              </div>
            </div>
          )}

          {verificationStep === "complete" && result && (
            <div className={`p-4 rounded-lg border ${result.canRent ? "bg-green-500/5 border-green-500/20" : "bg-destructive/5 border-destructive/20"}`}>
              <div className="flex items-start gap-3">
                {result.canRent
                  ? <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="font-semibold text-lg">{result.canRent ? t("verification.autoLicense.licenseApproved") : t("verification.autoLicense.licenseRejected")}</p>
                    <p className="text-sm text-muted-foreground">{result.message || result.error}</p>
                  </div>
                  {result.canRent && (
                    <div className="bg-background/50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{t("verification.autoLicense.driverScoreLabel")}</span>
                        <span className={`text-2xl font-bold ${getScoreColor(displayScore)}`}>{displayScore}</span>
                      </div>
                      <Progress value={displayScore} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {t("verification.autoLicense.driverScoreHint")}
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
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("verification.autoLicense.verifying")}</>
            ) : verificationStep === "complete" ? t("verification.autoLicense.reVerifyLicense") : (
              <><Search className="w-4 h-4 mr-2" />{t("verification.autoLicense.verifyLicense")}</>
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
                setLivenessError(t("verification.autoLicense.livenessIncomplete"));
              }
            }}
            onSuccess={async () => {
              livenessDoneRef.current = true;
              setLivenessStatus("verified");
              setLivenessError(null);
              const saveResult = await saveLivenessVerification(userId);
              if (saveResult.error) {
                toast({ title: t("verification.autoLicense.toast.saveWarning"), description: saveResult.error, variant: "destructive" });
              }
              goToLicenseStep();
            }}
            onFailure={(message) => {
              setLivenessStatus(isUnsupportedMessage(message) ? "unsupported" : "error");
              setLivenessError(message);
              toast({ title: t("verification.autoLicense.toast.livenessFailed"), description: message, variant: "destructive" });
            }}
          />
        </Suspense>
      </CardContent>
    </Card>
  );
};

export default AutoLicenseVerification;
