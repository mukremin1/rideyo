import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/hooks/useDateLocale";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Check, Crown, Star, Zap } from "lucide-react";
import { format } from "date-fns";

interface SubscriptionPlan {
  tier: "basic" | "premium" | "vip";
  price: number;
  discount: number;
  icon: React.ReactNode;
  color: string;
}

interface ActiveSubscription {
  id: string;
  tier: "basic" | "premium" | "vip";
  end_date: string;
  discount_percentage: number;
  status: string;
}

const PLAN_TIERS: SubscriptionPlan[] = [
  { tier: "basic", price: 5000, discount: 5, icon: <Zap className="h-6 w-6" />, color: "bg-blue-500" },
  { tier: "premium", price: 7500, discount: 15, icon: <Star className="h-6 w-6" />, color: "bg-purple-500" },
  { tier: "vip", price: 10000, discount: 25, icon: <Crown className="h-6 w-6" />, color: "bg-amber-500" },
];

export default function Subscription() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [currentSubscription, setCurrentSubscription] = useState<ActiveSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingTier, setActionLoadingTier] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchCurrentSubscription = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, tier, end_date, discount_percentage, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("end_date", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCurrentSubscription(data || null);
    } catch (error: unknown) {
      console.error("Error fetching subscription:", error);
      toast.error(t("subscription.fetchError"));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) void fetchCurrentSubscription();
  }, [authLoading, fetchCurrentSubscription, navigate, user]);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) return;
    if (currentSubscription?.tier === plan.tier) {
      toast.message(t("subscription.alreadyActive"));
      return;
    }

    setActionLoadingTier(plan.tier);
    try {
      if (currentSubscription?.id) {
        const { error: closeError } = await supabase
          .from("subscriptions")
          .update({ status: "cancelled" })
          .eq("id", currentSubscription.id)
          .eq("user_id", user.id);
        if (closeError) throw closeError;
      }

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const { error } = await supabase.from("subscriptions").insert({
        user_id: user.id,
        tier: plan.tier,
        end_date: endDate.toISOString(),
        discount_percentage: plan.discount,
        status: "active",
      });
      if (error) throw error;

      toast.success(t("subscription.activated", { name: t(`subscription.plans.${plan.tier}.name`) }));
      await fetchCurrentSubscription();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("subscription.unknownError");
      toast.error(t("subscription.subscribeFailed", { message }));
    } finally {
      setActionLoadingTier(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !currentSubscription) return;

    setCancelling(true);
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("id", currentSubscription.id)
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success(t("subscription.cancelSuccess"));
      setCurrentSubscription(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("subscription.unknownError");
      toast.error(t("subscription.cancelFailed", { message }));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{t("subscription.title")}</h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto">{t("subscription.subtitle")}</p>
            <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Zap className="h-4 w-4" /> {t("subscription.validOneMonth")}
            </div>
          </div>

          {currentSubscription && (
            <Card className="mb-8 border-primary">
              <CardHeader><CardTitle className="flex items-center gap-2"><Badge variant="default">{t("subscription.activeBadge")}</Badge></CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-lg">{t("subscription.activePlan", { name: t(`subscription.plans.${currentSubscription.tier}.name`) })}</p>
                <p className="text-sm text-muted-foreground">
                  {t("subscription.endDate", { date: format(new Date(currentSubscription.end_date), "P", { locale: dateLocale }) })}
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={handleCancelSubscription} disabled={cancelling}>
                  {cancelling ? t("subscription.cancelling") : t("subscription.cancelSubscription")}
                </Button>
              </CardFooter>
            </Card>
          )}

          {loading ? (
            <Card className="p-8 text-center"><CardDescription>{t("subscription.loadingPlans")}</CardDescription></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PLAN_TIERS.map((plan) => {
                const isActive = currentSubscription?.tier === plan.tier;
                const isWorking = actionLoadingTier === plan.tier;
                const features = t(`subscription.plans.${plan.tier}.features`, { returnObjects: true }) as string[];

                return (
                  <Card key={plan.tier} className={`relative ${isActive ? "border-primary shadow-lg" : ""}`}>
                    <CardHeader>
                      <div className={`${plan.color} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4`}>{plan.icon}</div>
                      <CardTitle className="text-xl">{t(`subscription.plans.${plan.tier}.name`)}</CardTitle>
                      <CardDescription><span className="text-3xl font-bold text-foreground">₺{plan.price}</span><span className="text-muted-foreground">{t("subscription.perMonth")}</span></CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2"><Check className="h-5 w-5 text-primary shrink-0 mt-0.5" /><span className="text-sm">{feature}</span></li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" onClick={() => void handleSubscribe(plan)} disabled={isActive || isWorking} variant={isActive ? "outline" : "default"}>
                        {isActive ? t("subscription.activePackage") : isWorking ? t("subscription.processing") : t("subscription.selectPackage")}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
