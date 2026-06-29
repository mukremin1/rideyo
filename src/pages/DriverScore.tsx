import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp, TrendingDown, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DEFAULT_DRIVER_SCORE, displayDriverScore } from "@/lib/driverScore";

interface DriverHistory {
  driver_score: number;
  penalty_points: number;
  traffic_violations: number;
  total_accidents: number;
  is_approved: boolean;
  verification_status: string;
  notes: string;
}

const DriverScore = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [driverHistory, setDriverHistory] = useState<DriverHistory | null>(null);
  const [isEligible, setIsEligible] = useState(false);
  const [eligibilityReason, setEligibilityReason] = useState("");
  const [loading, setLoading] = useState(true);

  const getScoreLabel = useCallback(
    (score: number) => {
      if (score >= 90) return t("verification.driverScore.labels.excellent");
      if (score >= 80) return t("verification.driverScore.labels.veryGood");
      if (score >= 70) return t("verification.driverScore.labels.good");
      if (score >= 60) return t("verification.driverScore.labels.fair");
      return t("verification.driverScore.labels.low");
    },
    [t],
  );

  const fetchDriverData = useCallback(async () => {
    try {
      const { data: history, error: historyError } = await supabase
        .from("driver_history")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (historyError && historyError.code !== "PGRST116") throw historyError;

      if (history) {
        setDriverHistory(history);

        const { data: eligibility, error: eligibilityError } = await supabase
          .rpc("check_driver_eligibility", { p_user_id: user?.id });

        if (!eligibilityError && eligibility && eligibility.length > 0) {
          setIsEligible(eligibility[0].is_eligible);
          setEligibilityReason(eligibility[0].reason);
        }
      }
    } catch (error) {
      console.error("Sürücü verileri yüklenemedi:", error);
      toast.error(t("verification.driverScore.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t, user?.id]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    void fetchDriverData();
  }, [fetchDriverData, navigate, user]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 text-center">
          <p className="text-xl text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!driverHistory) {
    const baselineScore = DEFAULT_DRIVER_SCORE;
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navbar />
        <main className="pt-24 pb-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold text-foreground mb-2">{t("verification.driverScore.title")}</h1>
              <p className="text-muted-foreground">{t("verification.driverScore.baselineSubtitle")}</p>
            </div>
            <Card className="p-6 mb-6">
              <div className="text-center mb-4">
                <Award className="w-16 h-16 mx-auto mb-4 text-primary" />
                <div className={`text-6xl font-bold mb-2 ${getScoreColor(baselineScore)}`}>{baselineScore}</div>
                <p className="text-lg text-muted-foreground mb-4">
                  {getScoreLabel(baselineScore)} {t("verification.driverScore.driverSuffix")}
                </p>
                <Progress value={baselineScore} className="h-3" />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                {t("verification.driverScore.baselineHint")}
              </p>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const score = displayDriverScore(driverHistory.driver_score);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">{t("verification.driverScore.title")}</h1>
            <p className="text-muted-foreground">{t("verification.driverScore.updateSubtitle")}</p>
          </div>

          <Card className="p-6 mb-6">
            <div className="flex items-center gap-4">
              {isEligible ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{t("verification.driverScore.eligibleTitle")}</h3>
                    <p className="text-muted-foreground">{t("verification.driverScore.eligibleDesc")}</p>
                  </div>
                  <Badge className="bg-green-500">{t("verification.driverScore.eligibleBadge")}</Badge>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{t("verification.driverScore.restrictedTitle")}</h3>
                    <p className="text-muted-foreground">{eligibilityReason}</p>
                  </div>
                  <Badge variant="destructive">{t("verification.driverScore.notEligibleBadge")}</Badge>
                </>
              )}
            </div>
          </Card>

          <Card className="p-6 mb-6">
            <div className="text-center mb-6">
              <Award className="w-16 h-16 mx-auto mb-4 text-primary" />
              <div className={`text-6xl font-bold mb-2 ${getScoreColor(score)}`}>
                {score}
              </div>
              <p className="text-lg text-muted-foreground mb-4">
                {getScoreLabel(score)} {t("verification.driverScore.driverSuffix")}
              </p>
              <Progress value={score} className="h-3" />
            </div>
          </Card>

          {driverHistory.notes && (
            <Card className="p-6">
              <h3 className="font-bold text-lg mb-4">{t("verification.driverScore.historyTitle")}</h3>
              <div className="space-y-2 text-sm">
                {driverHistory.notes.split("\n").filter(Boolean).map((note, index) => (
                  <div key={index} className="flex items-start gap-2">
                    {note.includes("+") ? (
                      <TrendingUp className="w-4 h-4 text-green-500 mt-0.5" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500 mt-0.5" />
                    )}
                    <p className="text-muted-foreground">{note}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DriverScore;
