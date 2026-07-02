import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Wallet, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { useDateLocale } from "@/hooks/useDateLocale";

type PayoutRow = {
  id: string;
  booking_id: string | null;
  owner_id: string | null;
  amount: number;
  platform_commission: number | null;
  owner_payout_amount: number | null;
  owner_payout_status: string | null;
  created_at: string | null;
};

type OwnerProfile = {
  id: string;
  full_name: string | null;
};

type PayoutBank = {
  user_id: string;
  iban: string;
  contact_name: string;
  contact_surname: string;
};

const AdminPayoutsSection = () => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { user } = useAuth();
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [owners, setOwners] = useState<Record<string, OwnerProfile>>({});
  const [banks, setBanks] = useState<Record<string, PayoutBank>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState("pending");

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payment_transactions")
      .select("id, booking_id, owner_id, amount, platform_commission, owner_payout_amount, owner_payout_status, created_at")
      .eq("type", "charge")
      .eq("status", "success")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(t("admin.payouts.loadError"));
      setLoading(false);
      return;
    }

    const list = (data ?? []) as PayoutRow[];
    setRows(list);

    const ownerIds = [...new Set(list.map((r) => r.owner_id).filter(Boolean))] as string[];
    if (ownerIds.length) {
      const [{ data: profiles }, { data: payoutProfiles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", ownerIds),
        supabase
          .from("owner_payout_profiles")
          .select("user_id, iban, contact_name, contact_surname")
          .in("user_id", ownerIds),
      ]);

      setOwners(Object.fromEntries((profiles ?? []).map((p) => [p.id, p])));
      setBanks(Object.fromEntries((payoutProfiles ?? []).map((p) => [p.user_id, p])));
    } else {
      setOwners({});
      setBanks({});
    }

    setLoading(false);
  }, [t]);

  useEffect(() => {
    void fetchPayouts();
  }, [fetchPayouts]);

  const pendingRows = useMemo(
    () => rows.filter((r) => r.owner_payout_status === "pending" && (r.owner_payout_amount ?? 0) > 0),
    [rows],
  );

  const paidRows = useMemo(
    () => rows.filter((r) => r.owner_payout_status === "paid_manual"),
    [rows],
  );

  const formatMoney = (value: number) =>
    value.toLocaleString("tr-TR", { maximumFractionDigits: 2 });

  const markPaid = async (row: PayoutRow) => {
    if (!user) return;
    setBusyId(row.id);
    try {
      const paidAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("payment_transactions")
        .update({
          owner_payout_status: "paid_manual",
          metadata: { paid_manually_at: paidAt, paid_by_admin: user.id },
        })
        .eq("id", row.id);

      if (updateError) throw updateError;

      if (row.owner_id && row.owner_payout_amount) {
        await supabase.from("payment_transactions").insert({
          booking_id: row.booking_id,
          owner_id: row.owner_id,
          type: "payout",
          status: "success",
          amount: row.owner_payout_amount,
          owner_payout_status: "not_applicable",
          metadata: { manual: true, source_charge_id: row.id, paid_by_admin: user.id },
        });
      }

      toast.success(t("admin.payouts.markPaidSuccess"));
      await fetchPayouts();
    } catch {
      toast.error(t("admin.payouts.markPaidError"));
    } finally {
      setBusyId(null);
    }
  };

  const renderList = (list: PayoutRow[], showAction: boolean) => {
    if (loading) {
      return <p className="text-sm text-muted-foreground py-8 text-center">{t("common.loading")}</p>;
    }

    if (list.length === 0) {
      return <p className="text-sm text-muted-foreground py-8 text-center">{t("admin.payouts.empty")}</p>;
    }

    return (
      <div className="space-y-4">
        {list.map((row) => {
          const owner = row.owner_id ? owners[row.owner_id] : null;
          const bank = row.owner_id ? banks[row.owner_id] : null;
          const ownerName = owner?.full_name ?? t("admin.payouts.unknownOwner");
          const iban = bank?.iban ?? t("admin.payouts.noIban");

          return (
            <Card key={row.id} className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{ownerName}</p>
                    {row.owner_payout_status === "paid_manual" ? (
                      <Badge variant="secondary">{t("admin.payouts.statusPaid")}</Badge>
                    ) : (
                      <Badge>{t("admin.payouts.statusPending")}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {row.created_at
                      ? format(parseISO(row.created_at), "d MMM yyyy HH:mm", { locale: dateLocale })
                      : "—"}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">{t("admin.payouts.iban")}: </span>
                    <span className="font-mono text-xs sm:text-sm break-all">{iban}</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm pt-1">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("admin.payouts.gross")}</p>
                      <p className="font-medium">₺{formatMoney(row.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("admin.payouts.commission")}</p>
                      <p className="font-medium">₺{formatMoney(row.platform_commission ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("admin.payouts.ownerShare")}</p>
                      <p className="font-semibold text-primary">₺{formatMoney(row.owner_payout_amount ?? 0)}</p>
                    </div>
                  </div>
                </div>
                {showAction && (
                  <Button
                    size="sm"
                    className="shrink-0"
                    disabled={busyId === row.id}
                    onClick={() => void markPaid(row)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {busyId === row.id ? t("admin.payouts.marking") : t("admin.payouts.markPaid")}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            {t("admin.payouts.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.payouts.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void fetchPayouts()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {t("admin.payouts.refresh")}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">
            {t("admin.payouts.tabPending")} ({pendingRows.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            {t("admin.payouts.tabPaid")} ({paidRows.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          {renderList(pendingRows, true)}
        </TabsContent>
        <TabsContent value="paid" className="mt-4">
          {renderList(paidRows, false)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPayoutsSection;
