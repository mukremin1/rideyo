import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar, Car, Clock, MapPin, RefreshCw, User, XCircle, StopCircle } from "lucide-react";
import { format, isFuture, isPast, parseISO } from "date-fns";
import { toast } from "sonner";
import { useDateLocale } from "@/hooks/useDateLocale";
import { paymentStatusLabel, isRentalActive } from "@/lib/paymentStatus";
import { invokeEdgeFunction } from "@/lib/serverApi";

type AdminBooking = {
  id: string;
  user_id: string;
  car_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  rental_type: string;
  payment_status: string | null;
  created_at: string | null;
  cars: {
    name: string;
    location: string;
    plate_number: string | null;
  } | null;
};

type RenterProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

const AdminRentalsSection = () => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [profiles, setProfiles] = useState<Record<string, RenterProfile>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchRentals = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, user_id, car_id, start_time, end_time, total_price, rental_type, payment_status, created_at,
        cars ( name, location, plate_number )
      `)
      .order("start_time", { ascending: false });

    if (error) {
      toast.error(t("admin.rentals.loadError"));
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as AdminBooking[];
    setBookings(rows);

    const userIds = [...new Set(rows.map((b) => b.user_id))];
    if (userIds.length) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds);

      const map: Record<string, RenterProfile> = {};
      for (const p of profileRows ?? []) {
        map[p.id] = p as RenterProfile;
      }
      setProfiles(map);
    } else {
      setProfiles({});
    }

    setLoading(false);
  }, [t]);

  useEffect(() => {
    void fetchRentals();
  }, [fetchRentals]);

  const filterBookings = useCallback(
    (type: "all" | "active" | "upcoming" | "past") => {
      return bookings.filter((booking) => {
        const startTime = parseISO(booking.start_time);
        const endTime = parseISO(booking.end_time);
        const cancelled = booking.payment_status === "cancelled" || booking.payment_status === "refunded";

        if (type === "active") {
          return (
            !cancelled &&
            (isRentalActive(booking.payment_status) ||
              (isPast(startTime) && isFuture(endTime) && booking.payment_status !== "pending"))
          );
        }
        if (type === "upcoming") {
          return isFuture(startTime) && !cancelled;
        }
        if (type === "past") {
          return isPast(endTime) || cancelled;
        }
        return true;
      });
    },
    [bookings],
  );

  const counts = useMemo(
    () => ({
      all: bookings.length,
      active: filterBookings("active").length,
      upcoming: filterBookings("upcoming").length,
      past: filterBookings("past").length,
    }),
    [bookings, filterBookings],
  );

  const cancelRental = async (bookingId: string) => {
    setBusyId(bookingId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error(t("admin.rentals.sessionError"));

      const { data, error } = await invokeEdgeFunction(
        "refund-payment",
        { bookingId, reason: "admin_cancelled" },
        session.access_token,
        (name, options) =>
          supabase.functions.invoke(name, options).then((r) => ({
            data: r.data as Record<string, unknown> | null,
            error: r.error,
          })),
      );

      if (error || !data?.success) {
        throw new Error(String(data?.error ?? error?.message ?? t("admin.rentals.cancelError")));
      }

      toast.success(t("admin.rentals.cancelSuccess"));
      await fetchRentals();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.rentals.cancelError"));
    } finally {
      setBusyId(null);
    }
  };

  const endRental = async (booking: AdminBooking) => {
    setBusyId(booking.id);
    try {
      const now = new Date().toISOString();
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({ payment_status: "completed", end_time: now })
        .eq("id", booking.id);

      if (bookingError) throw bookingError;

      const { error: carError } = await supabase
        .from("cars")
        .update({ lock_status: "locked", available: true })
        .eq("id", booking.car_id);

      if (carError) throw carError;

      toast.success(t("admin.rentals.endSuccess"));
      await fetchRentals();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("admin.rentals.endError"));
    } finally {
      setBusyId(null);
    }
  };

  const renderCard = (booking: AdminBooking) => {
    const profile = profiles[booking.user_id];
    const startTime = parseISO(booking.start_time);
    const endTime = parseISO(booking.end_time);
    const isActive =
      isRentalActive(booking.payment_status) ||
      (isPast(startTime) && isFuture(endTime) && booking.payment_status !== "cancelled");
    const canCancel =
      booking.payment_status !== "cancelled" &&
      booking.payment_status !== "refunded" &&
      (isFuture(startTime) || booking.payment_status === "pending");
    const canEnd = isActive && booking.payment_status !== "completed";

    return (
      <Card key={booking.id} className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">{booking.cars?.name ?? t("admin.rentals.unknownCar")}</h3>
              <Badge variant="outline">{paymentStatusLabel(booking.payment_status)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {booking.cars?.location}
              {booking.cars?.plate_number ? ` · ${booking.cars.plate_number}` : ""}
            </p>
            <p className="text-sm flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              {profile?.full_name ?? t("admin.rentals.unknownRenter")}
              {profile?.phone ? ` · ${profile.phone}` : ""}
            </p>
            <div className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {format(startTime, "d MMM yyyy HH:mm", { locale: dateLocale })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {format(endTime, "d MMM yyyy HH:mm", { locale: dateLocale })}
              </span>
            </div>
            <p className="text-sm font-medium text-primary">
              {booking.total_price.toLocaleString("tr-TR")} ₺ · {booking.rental_type}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {canEnd && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="secondary" size="sm" disabled={busyId === booking.id}>
                    <StopCircle className="w-4 h-4 mr-1" />
                    {t("admin.rentals.endRental")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("admin.rentals.endDialogTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("admin.rentals.endDialogDesc")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void endRental(booking)}>
                      {t("admin.rentals.endRental")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {canCancel && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={busyId === booking.id}>
                    {busyId === booking.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-1" />
                        {t("admin.rentals.cancelRental")}
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("admin.rentals.cancelDialogTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("admin.rentals.cancelDialogDesc")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void cancelRental(booking.id)}>
                      {t("admin.rentals.cancelRental")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return <p className="text-muted-foreground py-8 text-center">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{t("admin.rentals.title")}</h2>
          <p className="text-muted-foreground">{t("admin.rentals.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={() => void fetchRentals()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t("admin.rentals.refresh")}
        </Button>
      </div>

      {bookings.length === 0 ? (
        <Card className="p-10 text-center">
          <Car className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">{t("admin.rentals.empty")}</p>
        </Card>
      ) : (
        <Tabs defaultValue="active">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4">
            <TabsTrigger value="all" className="px-1 py-2 text-[10px] leading-tight whitespace-normal sm:text-xs">
              {t("admin.rentals.tabAll")} ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="active" className="px-1 py-2 text-[10px] leading-tight whitespace-normal sm:text-xs">
              {t("admin.rentals.tabActive")} ({counts.active})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="px-1 py-2 text-[10px] leading-tight whitespace-normal sm:text-xs">
              {t("admin.rentals.tabUpcoming")} ({counts.upcoming})
            </TabsTrigger>
            <TabsTrigger value="past" className="px-1 py-2 text-[10px] leading-tight whitespace-normal sm:text-xs">
              {t("admin.rentals.tabPast")} ({counts.past})
            </TabsTrigger>
          </TabsList>
          {(["all", "active", "upcoming", "past"] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-4 mt-4">
              {filterBookings(tab).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t("admin.rentals.emptyTab")}</p>
              ) : (
                filterBookings(tab).map(renderCard)
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default AdminRentalsSection;
