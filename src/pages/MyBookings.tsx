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
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { isBookingPaid } from "@/lib/paymentStatus";
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
      toast.error("Rezervasyonlar yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    setCancelling(bookingId);
    try {
      const { data, error } = await supabase.functions.invoke("refund-payment", {
        body: { bookingId, reason: "user_cancelled" },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "İptal başarısız");
      }

      toast.success("Rezervasyon iptal edildi");
      fetchBookings();
    } catch (error) {
      console.error("İptal hatası:", error);
      toast.error(error instanceof Error ? error.message : "Rezervasyon iptal edilirken bir hata oluştu");
    } finally {
      setCancelling(null);
    }
  };

  const getBookingStatus = (booking: Booking) => {
    const now = new Date();
    const startTime = parseISO(booking.start_time);
    const endTime = parseISO(booking.end_time);

    if (booking.payment_status === "cancelled") {
      return { label: "İptal Edildi", variant: "destructive" as const, icon: XCircle };
    }
    if (booking.payment_status === "pending") {
      return { label: "Ödeme Bekliyor", variant: "secondary" as const, icon: AlertCircle };
    }
    if (isPast(endTime)) {
      return { label: "Tamamlandı", variant: "default" as const, icon: CheckCircle2 };
    }
    if (isPast(startTime) && isFuture(endTime)) {
      return { label: "Aktif", variant: "default" as const, icon: Car };
    }
    return { label: "Yaklaşan", variant: "outline" as const, icon: Clock };
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
      case "minute": return "Dakikalık";
      case "hourly": return "Saatlik";
      case "daily": return "Günlük";
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
            <p className="text-muted-foreground">Yükleniyor...</p>
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
                <CardTitle className="text-2xl">Giriş Yapmalısınız</CardTitle>
                <CardDescription>
                  Rezervasyonlarınızı görüntülemek için giriş yapmanız gerekmektedir.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/auth")} size="lg" className="w-full">
                  Giriş Yap / Üye Ol
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
                <h3 className="font-semibold text-lg">{booking.cars?.name || "Araç"}</h3>
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
                  {format(parseISO(booking.start_time), "d MMMM yyyy, HH:mm", { locale: tr })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {format(parseISO(booking.end_time), "d MMMM yyyy, HH:mm", { locale: tr })}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Kiralama Tipi</p>
                  <p className="font-medium">{getRentalTypeLabel(booking.rental_type)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Toplam Tutar</p>
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
                    Ödeme Yap
                  </Button>
                )}

                {isBookingPaid(booking.payment_status) &&
                  !isPast(parseISO(booking.end_time)) &&
                  booking.payment_status !== "in_progress" && (
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate("/start-rental", {
                        state: {
                          bookingId: booking.id,
                          carId: booking.car_id,
                          carName: booking.cars?.name,
                        },
                      })
                    }
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Kiralamayı Başlat
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
                            İptal Et
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Rezervasyonu İptal Et</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bu rezervasyonu iptal etmek istediğinizden emin misiniz? 
                          İptal koşulları için iptal politikamızı inceleyebilirsiniz.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Vazgeç</AlertDialogCancel>
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
                  Sözleşme
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
      <p className="text-muted-foreground mb-6">Araç kiralayarak hemen başlayabilirsiniz.</p>
      <Button onClick={() => navigate("/cars")}>
        <Car className="w-4 h-4 mr-2" />
        Araçları İncele
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
              <h1 className="text-3xl font-bold text-foreground">Rezervasyonlarım</h1>
              <p className="text-muted-foreground">Tüm kiralama geçmişinizi görüntüleyin</p>
            </div>
            <Button variant="outline" onClick={fetchBookings}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Yenile
            </Button>
          </div>

          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">
                Tümü ({bookings.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Aktif ({filterBookings("active").length})
              </TabsTrigger>
              <TabsTrigger value="upcoming">
                Yaklaşan ({filterBookings("upcoming").length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Geçmiş ({filterBookings("completed").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {bookings.length === 0 ? (
                <EmptyState message="Henüz rezervasyonunuz bulunmuyor" />
              ) : (
                bookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              {filterBookings("active").length === 0 ? (
                <EmptyState message="Aktif rezervasyonunuz bulunmuyor" />
              ) : (
                filterBookings("active").map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              )}
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-4">
              {filterBookings("upcoming").length === 0 ? (
                <EmptyState message="Yaklaşan rezervasyonunuz bulunmuyor" />
              ) : (
                filterBookings("upcoming").map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {filterBookings("completed").length === 0 ? (
                <EmptyState message="Tamamlanmış rezervasyonunuz bulunmuyor" />
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
