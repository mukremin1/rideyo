import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_DRIVER_SCORE } from "@/lib/driverScore";

const PENALTY_THRESHOLD = 70;

interface DriverHistoryFormProps {
  userId: string;
  onVerified: (isApproved: boolean, riskLevel: string) => void;
}
type DbMutationResult = { data: unknown; error: { message?: string; details?: string } | null };

const DriverHistoryForm = ({ userId, onVerified }: DriverHistoryFormProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
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

  const riskLevelLabel = (level: string) => {
    if (level === "low") return t("verification.driverHistory.riskLow");
    if (level === "medium") return t("verification.driverHistory.riskMedium");
    return t("verification.driverHistory.riskHigh");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!userId) {
      toast({
        title: t("verification.driverHistory.toast.signInRequired"),
        description: t("verification.driverHistory.toast.signInRequiredDesc"),
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const driverScore = DEFAULT_DRIVER_SCORE;

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

      const { data: existing, error: selectError } = await supabase
        .from("driver_history")
        .select("id, user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (selectError) {
        console.error("Select error:", selectError);
        toast({
          title: t("verification.driverHistory.toast.dbError"),
          description: selectError.message ?? t("verification.driverHistory.toast.recordCheckFailed"),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.debug("Existing driver_history:", existing);

      let result: DbMutationResult | null = null;
      let op: "insert" | "update";

      if (existing && existing.id) {
        op = "update";
        const { data, error } = await supabase
          .from("driver_history")
          .update(payload)
          .eq("user_id", userId)
          .select()
          .single();

        result = { data, error };
      } else {
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

        if ((result.error.message || "").toLowerCase().includes("duplicate")) {
          toast({
            title: t("verification.driverHistory.toast.duplicate"),
            description: t("verification.driverHistory.toast.duplicateDesc"),
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if ((result.error.message || "").toLowerCase().includes("permission") || (result.error.details || "").toLowerCase().includes("policy")) {
          toast({
            title: t("verification.driverHistory.toast.permissionError"),
            description: t("verification.driverHistory.toast.permissionErrorDesc"),
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        toast({
          title: t("verification.driverHistory.toast.saveError"),
          description: result.error.message ?? t("verification.driverHistory.toast.saveFailed"),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const riskLevel = calculateRiskLevel(driverData.penaltyPoints, driverData.totalAccidents, driverData.trafficViolations);
      let message = "";
      if (!isApproved) {
        if (driverData.penaltyPoints > PENALTY_THRESHOLD) {
          message = t("verification.driverHistory.messages.penaltyExceeded", {
            points: driverData.penaltyPoints,
            max: PENALTY_THRESHOLD,
          });
        } else if (driverData.totalAccidents >= 3) {
          message = t("verification.driverHistory.messages.accidentsBlocked");
        } else if (driverScore < 60) {
          message = t("verification.driverHistory.messages.scoreTooLow", { score: driverScore });
        } else {
          message = t("verification.driverHistory.messages.incomplete");
        }
      } else {
        message = t("verification.driverHistory.messages.success");
      }

      setVerificationResult({ isApproved, riskLevel, message });
      onVerified(isApproved, riskLevel);

      toast({
        title: isApproved ? t("verification.driverHistory.verifySuccess") : t("verification.driverHistory.verifyFailed"),
        description: message,
        variant: isApproved ? "default" : "destructive",
      });
    } catch (err: unknown) {
      console.error("Unhandled hata:", err);
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: t("verification.driverHistory.toast.unexpectedError"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <CardTitle>{t("verification.driverHistory.title")}</CardTitle>
        </div>
        <CardDescription>{t("verification.driverHistory.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">{t("verification.driverHistory.licenseNumber")}</Label>
            <Input
              id="licenseNumber"
              placeholder={t("verification.driverHistory.licenseNumberPlaceholder")}
              value={driverData.licenseNumber}
              onChange={(e) => setDriverData({ ...driverData, licenseNumber: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="penaltyPoints">
              {t("verification.driverHistory.penaltyPoints", { max: PENALTY_THRESHOLD })}
            </Label>
            <Input
              id="penaltyPoints"
              type="number"
              min="0"
              placeholder={t("verification.driverHistory.penaltyPointsPlaceholder")}
              value={driverData.penaltyPoints ?? ""}
              onChange={(e) => setDriverData({ ...driverData, penaltyPoints: Number.isNaN(parseInt(e.target.value, 10)) ? 0 : parseInt(e.target.value, 10) })}
              required
            />
            {driverData.penaltyPoints > PENALTY_THRESHOLD && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                {t("verification.driverHistory.penaltyExceeded")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalAccidents">{t("verification.driverHistory.totalAccidents")}</Label>
              <Input
                id="totalAccidents"
                type="number"
                min="0"
                placeholder="0"
                value={driverData.totalAccidents ?? ""}
                onChange={(e) => setDriverData({ ...driverData, totalAccidents: Number.isNaN(parseInt(e.target.value, 10)) ? 0 : parseInt(e.target.value, 10) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trafficViolations">{t("verification.driverHistory.trafficViolations")}</Label>
              <Input
                id="trafficViolations"
                type="number"
                min="0"
                placeholder="0"
                value={driverData.trafficViolations ?? ""}
                onChange={(e) => setDriverData({ ...driverData, trafficViolations: Number.isNaN(parseInt(e.target.value, 10)) ? 0 : parseInt(e.target.value, 10) })}
                required
              />
            </div>
          </div>

          {verificationResult && (
            <div className={`p-4 rounded-lg border ${verificationResult.isApproved ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"}`}>
              <div className="flex items-start gap-3">
                {verificationResult.isApproved ? (
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold mb-1">
                    {verificationResult.isApproved
                      ? t("verification.driverHistory.verifySuccess")
                      : t("verification.driverHistory.verifyFailed")}
                  </p>
                  <p className="text-sm text-muted-foreground mb-2">{verificationResult.message}</p>
                  <Badge variant={verificationResult.riskLevel === "low" ? "default" : verificationResult.riskLevel === "medium" ? "secondary" : "destructive"}>
                    {t("verification.driverHistory.riskLevel", { level: riskLevelLabel(verificationResult.riskLevel) })}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("verification.driverHistory.submitting") : t("verification.driverHistory.submit")}
          </Button>
        </form>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            <Trans
              i18nKey="verification.driverHistory.note"
              values={{ max: PENALTY_THRESHOLD }}
              components={{ strong: <strong /> }}
            />
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DriverHistoryForm;
