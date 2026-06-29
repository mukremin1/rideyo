import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Car, 
  Clock, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  FileText,
  Play
} from "lucide-react";
import { format, isPast, isFuture, isToday, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/hooks/useDateLocale";
import { toast } from "sonner";
import { isBookingPaid } from "@/lib/paymentStatus";
import { invokeEdgeFunction } from "@/lib/serverApi";
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

interface Booking {
  id: string;
  car_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  rental_type: string;
  payment_status: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  created_at: string | null;
  cars: {
    name: string;
    type: string;
    image_url: string | null;
    location: string;
    fuel_type: string;
    transmission: string;
  } | null;
}

const MyBookings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      fetchBookings();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          cars (
            name,
            type,
            image_url,
            location,
            fuel_type,
            transmission
          )
        `)
        .eq("user_id", user!.id)
        .order("start_time", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Rezervasyonları getirme hatası:", error);
      toast.error(t("bookings.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    setCancelling(bookingId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error(t("bookings.sessionNotFound"));
      }

      const { data, error } = await invokeEdgeFunction(
        "refund-payment",
        { bookingId, reason: "user_cancelled" },
        session.access_token,
        (name, options) =>
          supabase.functions.invoke(name, options).then((r) => ({
            data: r.data as Record<string, unknown> | null,
            error: r.error,
          })),
      );

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || t("bookings.cancelActionFailed"));
      }

      toast.success(t("bookings.cancelSuccess"));
      fetchBookings();
    } catch (error) {
      console.error("İptal hatası:", error);
      toast.error(error instanceof Error ? error.message : t("bookings.cancelFailed"));
    } finally {
      setCancelling(null);
    }
  };

  const getBookingStatus = (booking: Booking) => {
    const now = new Date();
    const startTime = parseISO(booking.start_time);
    const endTime = parseISO(booking.end_time);

    if (booking.payment_status === "cancelled") {
      return { label: t("bookings.statusCancelled"), variant: "destructive" as const, icon: XCircle };
    }
    if (booking.payment_status === "pending") {
      return { label: t("bookings.statusPendingPayment"), variant: "secondary" as const, icon: AlertCircle };
    }
    if (isPast(endTime)) {
      return { label: t("bookings.statusCompleted"), variant: "default" as const, icon: CheckCircle2 };
    }
    if (isPast(startTime) && isFuture(endTime)) {
      return { label: t("bookings.statusActive"), variant: "default" as const, icon: Car };
    }
    return { label: t("bookings.statusUpcoming"), variant: "outline" as const, icon: Clock };
  };

  const filterBookings = (type: string) => {
    const now = new Date();
    return bookings.filter((booking) => {
      const endTime = parseISO(booking.end_time);
      const startTime = parseISO(booking.start_time);
      
      if (type === "active") {
        return isPast(startTime) && isFuture(endTime) && booking.payment_status !== "cancelled";
      }
      if (type === "upcoming") {
        return isFuture(startTime) && booking.payment_status !== "cancelled";
      }
      if (type === "completed") {
        return isPast(endTime) || booking.payment_status === "cancelled";
      }
      return true;
    });
  };

  const getRentalTypeLabel = (type: string) => {
    switch (type) {
      case "minute": return t("payment.typeMinute");
      case "hour":
      case "hourly": return t("payment.typeHour");
      case "day":
      case "daily": return t("payment.typeDay");
      default: return type;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-12 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">{t("common.loading")}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">{t("bookings.loginTitle")}</CardTitle>
                <CardDescription>
                  {t("bookings.loginDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/auth")} size="lg" className="w-full">
                  {t("bookings.loginButton")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const status = getBookingStatus(booking);
    const StatusIcon = status.icon;
    const canCancel = booking.payment_status !== "cancelled" && isFuture(parseISO(booking.start_time));

    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {/* Car Image */}
          <div className="sm:w-48 h-40 sm:h-auto bg-muted flex-shrink-0">
            {booking.cars?.image_url ? (
              <img
                src={booking.cars.image_url}
                alt={booking.cars.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Car className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Booking Info */}
          <div className="flex-1 p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div>
                <h3 className="font-semibold text-lg">{booking.cars?.name || t("bookings.defaultCarName")}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {booking.cars?.location}
                </p>
              </div>
              <Badge variant={status.variant} className="flex items-center gap-1">
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(parseISO(booking.start_time), "d MMMM yyyy, HH:mm", { locale: dateLocale })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {format(parseISO(booking.end_time), "d MMMM yyyy, HH:mm", { locale: dateLocale })}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t("bookings.rentalTypeLabel")}</p>
                  <p className="font-medium">{getRentalTypeLabel(booking.rental_type)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("bookings.totalAmount")}</p>
                  <p className="font-semibold text-primary">{booking.total_price.toLocaleString("tr-TR")} ₺</p>
                </div>
              </div>

              <div className="flex gap-2">
                {booking.payment_status === "pending" && (
                  <Button 
                    size="sm"
                    onClick={() => navigate("/payment", { 
                      state: { 
                        bookingId: booking.id,
                        carId: booking.car_id,
                        carName: booking.cars?.name,
                        totalPrice: booking.total_price,
                        rentalType: booking.rental_type,
                        startTime: booking.start_time,
                        endTime: booking.end_time
                      } 
                    })}
                  >
                    <CreditCard className="w-4 h-4 mr-1" />
                    {t("bookings.pay")}
                  </Button>
                )}

                {isBookingPaid(booking.payment_status) &&
                  !isPast(parseISO(booking.end_time)) &&
                  booking.payment_status !== "in_progress" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate(`/start-rental?bookingId=${booking.id}`, {
                        state: {
                          bookingId: booking.id,
                          carId: booking.car_id,
                          carName: booking.cars?.name,
                        },
                      })
                    }
                  >
                    <Play className="w-4 h-4 mr-1" />
                    {t("bookings.startRental")}
                  </Button>
                )}
                
                {canCancel && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={cancelling === booking.id}>
                        {cancelling === booking.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-1" />
                            {t("bookings.cancelBooking")}
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("bookings.cancelDialogTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("bookings.cancelDialogDesc")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("bookings.cancelDialogDismiss")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => cancelBooking(booking.id)}>
                          İptal Et
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate("/rental-agreement")}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  {t("bookings.agreement")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12">
      <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">{message}</h3>
      <p className="text-muted-foreground mb-6">{t("bookings.emptyHint")}</p>
      <Button onClick={() => navigate("/cars")}>
        <Car className="w-4 h-4 mr-2" />
        {t("bookings.browseCars")}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t("bookings.title")}</h1>
              <p className="text-muted-foreground">{t("bookings.subtitle")}</p>
            </div>
            <Button variant="outline" onClick={fetchBookings}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t("bookings.refresh")}
            </Button>
          </div>

          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                {t("bookings.tabAll")} ({bookings.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                {t("bookings.tabActive")} ({filterBookings("active").length})
              </TabsTrigger>
              <TabsTrigger value="upcoming">
                {t("bookings.tabUpcoming")} ({filterBookings("upcoming").length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                {t("bookings.tabPast")} ({filterBookings("completed").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {bookings.length === 0 ? (
                <EmptyState message={t("bookings.emptyAll")} />
              ) : (
                bookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              {filterBookings("active").length === 0 ? (
                <EmptyState message={t("bookings.emptyActive")} />
              ) : (
                filterBookings("active").map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              )}
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-4">
              {filterBookings("upcoming").length === 0 ? (
                <EmptyState message={t("bookings.emptyUpcoming")} />
              ) : (
                filterBookings("upcoming").map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {filterBookings("completed").length === 0 ? (
                <EmptyState message={t("bookings.emptyPast")} />
              ) : (
                filterBookings("completed").map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MyBookings;
