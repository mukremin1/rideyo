import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Car,
  Calendar,
  DollarSign,
  Star,
  Clock,
  Users,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { isBookingPaid } from "@/lib/paymentStatus";
import { format, isWithinInterval, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

type OwnerCar = {
  id: string;
  name: string;
  type: string;
  plate: string;
  status: string;
  totalRentals: number;
  monthlyEarnings: number;
  rating: number;
  nextBooking: string;
};

type OwnerRental = {
  id: string;
  carName: string;
  renter: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: string;
  rating: number | null;
};

const OwnerDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    monthlyEarnings: 0,
    totalRentals: 0,
    activeRentals: 0,
    averageRating: 0,
    totalCars: 0,
  });
  const [recentRentals, setRecentRentals] = useState<OwnerRental[]>([]);
  const [cars, setCars] = useState<OwnerCar[]>([]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboardData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: ownerCars } = await supabase
        .from("cars")
        .select("id, name, type, plate_number, available")
        .eq("owner_id", user.id);

      const carList = ownerCars ?? [];
      const carIds = carList.map((c) => c.id);

      if (carIds.length === 0) {
        setStats({
          totalEarnings: 0,
          monthlyEarnings: 0,
          totalRentals: 0,
          activeRentals: 0,
          averageRating: 0,
          totalCars: 0,
        });
        setCars([]);
        setRecentRentals([]);
        return;
      }

      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, car_id, user_id, start_time, end_time, total_price, payment_status, rental_type")
        .in("car_id", carIds)
        .order("created_at", { ascending: false });

      const paidBookings = (bookings ?? []).filter((b) => isBookingPaid(b.payment_status));
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalEarnings = paidBookings.reduce((sum, b) => sum + b.total_price, 0);
      const monthlyEarnings = paidBookings
        .filter((b) => parseISO(b.start_time) >= monthStart)
        .reduce((sum, b) => sum + b.total_price, 0);

      const activeRentals = paidBookings.filter((b) =>
        isWithinInterval(now, { start: parseISO(b.start_time), end: parseISO(b.end_time) }),
      ).length;

      const renterIds = [...new Set(paidBookings.map((b) => b.user_id))];
      const { data: profiles } = renterIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", renterIds)
        : { data: [] };

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Kiracı"]));

      const { data: reviews } = await supabase
        .from("reviews")
        .select("car_id, rating")
        .in("car_id", carIds);

      const avgRating =
        reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

      const carBookingsMap = new Map<string, typeof paidBookings>();
      for (const booking of paidBookings) {
        const list = carBookingsMap.get(booking.car_id) ?? [];
        list.push(booking);
        carBookingsMap.set(booking.car_id, list);
      }

      const mappedCars: OwnerCar[] = carList.map((car) => {
        const carBookings = carBookingsMap.get(car.id) ?? [];
        const carMonthly = carBookings
          .filter((b) => parseISO(b.start_time) >= monthStart)
          .reduce((sum, b) => sum + b.total_price, 0);

        const activeOnCar = carBookings.some((b) =>
          isWithinInterval(now, { start: parseISO(b.start_time), end: parseISO(b.end_time) }),
        );

        const upcoming = carBookings
          .filter((b) => parseISO(b.start_time) > now)
          .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())[0];

        const carReviews = (reviews ?? []).filter((r) => r.car_id === car.id);
        const carRating =
          carReviews.length > 0
            ? carReviews.reduce((sum, r) => sum + r.rating, 0) / carReviews.length
            : 0;

        let status = "available";
        if (!car.available) status = "maintenance";
        else if (activeOnCar) status = "rented";

        return {
          id: car.id,
          name: car.name,
          type: car.type,
          plate: car.plate_number ?? "—",
          status,
          totalRentals: carBookings.length,
          monthlyEarnings: carMonthly,
          rating: Math.round(carRating * 10) / 10,
          nextBooking: upcoming
            ? format(parseISO(upcoming.start_time), "d MMM yyyy", { locale: tr })
            : "Rezervasyon yok",
        };
      });

      const carNameMap = new Map(carList.map((c) => [c.id, c.name]));

      const mappedRentals: OwnerRental[] = paidBookings.slice(0, 20).map((b) => {
        const start = parseISO(b.start_time);
        const end = parseISO(b.end_time);
        let status = "completed";
        if (isWithinInterval(now, { start, end })) status = "active";
        else if (start > now) status = "upcoming";

        return {
          id: b.id,
          carName: carNameMap.get(b.car_id) ?? "Araç",
          renter: profileMap.get(b.user_id) ?? "Kiracı",
          startDate: format(start, "d MMM yyyy", { locale: tr }),
          endDate: format(end, "d MMM yyyy", { locale: tr }),
          amount: b.total_price,
          status,
          rating: null,
        };
      });

      setStats({
        totalEarnings,
        monthlyEarnings,
        totalRentals: paidBookings.length,
        activeRentals,
        averageRating: Math.round(avgRating * 10) / 10,
        totalCars: carList.length,
      });
      setCars(mappedCars);
      setRecentRentals(mappedRentals);
    } catch (error) {
      console.error("Owner dashboard yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: BadgeVariant; label: string }> = {
      active: { variant: "default", label: "Aktif" },
      rented: { variant: "secondary", label: "Kiralandı" },
      maintenance: { variant: "destructive", label: "Bakımda" },
      available: { variant: "outline", label: "Müsait" },
      completed: { variant: "secondary", label: "Tamamlandı" },
      upcoming: { variant: "outline", label: "Yaklaşan" },
    };
    const config = variants[status] || variants.available;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatMoney = (value: number) =>
    value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 mt-20 text-center text-muted-foreground">
          Yükleniyor...
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 mt-20 mb-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Araç Sahibi Paneli</h1>
              <p className="text-muted-foreground">Araçlarınızı ve kazançlarınızı yönetin</p>
            </div>
            <div className="flex gap-2">
              <Link to="/owner/payout">
                <Button variant="outline" size="lg">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Hakediş Ayarları
                </Button>
              </Link>
              <Link to="/add-car">
                <Button size="lg">
                  <Car className="w-4 h-4 mr-2" />
                  Araç Ekle
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <DollarSign className="w-8 h-8 text-primary mb-2" />
                <p className="text-2xl font-bold">₺{formatMoney(stats.totalEarnings)}</p>
                <p className="text-xs text-muted-foreground">Toplam Kazanç</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <TrendingUp className="w-8 h-8 text-green-600 mb-2" />
                <p className="text-2xl font-bold">₺{formatMoney(stats.monthlyEarnings)}</p>
                <p className="text-xs text-muted-foreground">Bu Ay</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Calendar className="w-8 h-8 text-blue-600 mb-2" />
                <p className="text-2xl font-bold">{stats.totalRentals}</p>
                <p className="text-xs text-muted-foreground">Toplam Kiralama</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Clock className="w-8 h-8 text-orange-600 mb-2" />
                <p className="text-2xl font-bold">{stats.activeRentals}</p>
                <p className="text-xs text-muted-foreground">Aktif Kiralama</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Star className="w-8 h-8 text-yellow-600 mb-2" />
                <p className="text-2xl font-bold">{stats.averageRating || "—"}</p>
                <p className="text-xs text-muted-foreground">Ortalama Puan</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Car className="w-8 h-8 text-purple-600 mb-2" />
                <p className="text-2xl font-bold">{stats.totalCars}</p>
                <p className="text-xs text-muted-foreground">Toplam Araç</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
              <TabsTrigger value="cars">Araçlarım</TabsTrigger>
              <TabsTrigger value="rentals">Kiralamalar</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Son Kiralamalar</CardTitle>
                    <CardDescription>En son gerçekleşen kiralama işlemleri</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentRentals.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Henüz kiralama yok.</p>
                    ) : (
                      <div className="space-y-4">
                        {recentRentals.slice(0, 3).map((rental) => (
                          <div key={rental.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <p className="font-semibold">{rental.carName}</p>
                              <p className="text-sm text-muted-foreground">{rental.renter}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {rental.startDate} - {rental.endDate}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">₺{formatMoney(rental.amount)}</p>
                              {getStatusBadge(rental.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Hızlı Eylemler</CardTitle>
                    <CardDescription>Sık kullanılan işlemler</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link to="/add-car" className="block">
                      <Button className="w-full justify-start" variant="outline">
                        <Car className="w-4 h-4 mr-2" />
                        Yeni Araç Ekle
                      </Button>
                    </Link>
                    <Link to="/availability-calendar" className="block">
                      <Button className="w-full justify-start" variant="outline">
                        <Calendar className="w-4 h-4 mr-2" />
                        Müsaitlik Takvimi
                      </Button>
                    </Link>
                    <Link to="/my-cars" className="block">
                      <Button className="w-full justify-start" variant="outline">
                        <Calendar className="w-4 h-4 mr-2" />
                        Araçlarım
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="cars" className="space-y-6">
              {cars.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Henüz araç eklemediniz.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {cars.map((car) => (
                    <Card key={car.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{car.name}</CardTitle>
                            <CardDescription>{car.type} • {car.plate}</CardDescription>
                          </div>
                          {getStatusBadge(car.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Toplam Kiralama</p>
                            <p className="text-xl font-bold">{car.totalRentals}</p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Aylık Kazanç</p>
                            <p className="text-xl font-bold text-primary">₺{formatMoney(car.monthlyEarnings)}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                            <span className="font-semibold">{car.rating || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {car.nextBooking}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rentals" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tüm Kiralamalar</CardTitle>
                  <CardDescription>Geçmiş ve aktif kiralama işlemleri</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentRentals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Henüz kiralama yok.</p>
                  ) : (
                    <div className="space-y-4">
                      {recentRentals.map((rental) => (
                        <div key={rental.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-lg">{rental.carName}</h4>
                              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                <Users className="w-4 h-4" />
                                {rental.renter}
                              </p>
                            </div>
                            {getStatusBadge(rental.status)}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Başlangıç</p>
                              <p className="font-semibold text-sm">{rental.startDate}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Bitiş</p>
                              <p className="font-semibold text-sm">{rental.endDate}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Tutar</p>
                              <p className="font-semibold text-sm text-primary">₺{formatMoney(rental.amount)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
};

export default OwnerDashboard;
