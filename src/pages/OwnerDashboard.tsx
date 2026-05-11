import { useState } from "react";
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
  MapPin,
  Users,
  AlertCircle
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import { Link } from "react-router-dom";
type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const OwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  // Mock data - gerçek uygulamada API'den gelecek
  const stats = {
    totalEarnings: "45.280",
    monthlyEarnings: "12.450",
    totalRentals: 156,
    activeRentals: 3,
    averageRating: 4.8,
    totalCars: 4
  };

  const recentRentals = [
    {
      id: 1,
      carName: "Toyota Corolla",
      renter: "Ahmet Y.",
      startDate: "15 Kas 2024",
      endDate: "17 Kas 2024",
      amount: "1.200",
      status: "completed",
      rating: 5
    },
    {
      id: 2,
      carName: "Honda Civic",
      renter: "Zeynep K.",
      startDate: "18 Kas 2024",
      endDate: "20 Kas 2024",
      amount: "1.350",
      status: "active",
      rating: null
    },
    {
      id: 3,
      carName: "Volkswagen Golf",
      renter: "Mehmet D.",
      startDate: "10 Kas 2024",
      endDate: "12 Kas 2024",
      amount: "950",
      status: "completed",
      rating: 4
    }
  ];

  const cars = [
    {
      id: 1,
      name: "Toyota Corolla",
      type: "Sedan",
      plate: "34 ABC 123",
      status: "active",
      totalRentals: 45,
      monthlyEarnings: "4.200",
      rating: 4.9,
      nextBooking: "22 Kas 2024"
    },
    {
      id: 2,
      name: "Honda Civic",
      type: "Sedan",
      plate: "34 DEF 456",
      status: "rented",
      totalRentals: 38,
      monthlyEarnings: "3.800",
      rating: 4.7,
      nextBooking: "25 Kas 2024"
    },
    {
      id: 3,
      name: "Volkswagen Golf",
      type: "Kompakt",
      plate: "34 GHI 789",
      status: "maintenance",
      totalRentals: 52,
      monthlyEarnings: "3.150",
      rating: 4.8,
      nextBooking: "Bakımda"
    },
    {
      id: 4,
      name: "Ford Focus",
      type: "Kompakt",
      plate: "34 JKL 012",
      status: "available",
      totalRentals: 21,
      monthlyEarnings: "1.300",
      rating: 5.0,
      nextBooking: "Rezervasyon yok"
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: BadgeVariant; label: string }> = {
      active: { variant: "default", label: "Aktif" },
      rented: { variant: "secondary", label: "Kiralandı" },
      maintenance: { variant: "destructive", label: "Bakımda" },
      available: { variant: "outline", label: "Müsait" },
      completed: { variant: "secondary", label: "Tamamlandı" }
    };
    const config = variants[status] || variants.available;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

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
            <Link to="/add-car">
              <Button size="lg">
                <Car className="w-4 h-4 mr-2" />
                Araç Ekle
              </Button>
            </Link>
          </div>

          {/* İstatistik Kartları */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
                <p className="text-2xl font-bold">₺{stats.totalEarnings}</p>
                <p className="text-xs text-muted-foreground">Toplam Kazanç</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-2xl font-bold">₺{stats.monthlyEarnings}</p>
                <p className="text-xs text-muted-foreground">Bu Ay</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-2xl font-bold">{stats.totalRentals}</p>
                <p className="text-xs text-muted-foreground">Toplam Kiralama</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-2xl font-bold">{stats.activeRentals}</p>
                <p className="text-xs text-muted-foreground">Aktif Kiralama</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Star className="w-8 h-8 text-yellow-600" />
                </div>
                <p className="text-2xl font-bold">{stats.averageRating}</p>
                <p className="text-xs text-muted-foreground">Ortalama Puan</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <Car className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-2xl font-bold">{stats.totalCars}</p>
                <p className="text-xs text-muted-foreground">Toplam Araç</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
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
                    <div className="space-y-4">
                      {recentRentals.slice(0, 3).map(rental => (
                        <div key={rental.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-semibold">{rental.carName}</p>
                            <p className="text-sm text-muted-foreground">{rental.renter}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {rental.startDate} - {rental.endDate}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">₺{rental.amount}</p>
                            {getStatusBadge(rental.status)}
                          </div>
                        </div>
                      ))}
                    </div>
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
                    <Link to="/earnings-calculator" className="block">
                      <Button className="w-full justify-start" variant="outline">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Kazanç Hesapla
                      </Button>
                    </Link>
                    <Link to="/car-comparison" className="block">
                      <Button className="w-full justify-start" variant="outline">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Araç Karşılaştır
                      </Button>
                    </Link>
                    <Link to="/my-cars" className="block">
                      <Button className="w-full justify-start" variant="outline">
                        <Calendar className="w-4 h-4 mr-2" />
                        Rezervasyonları Görüntüle
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="cars" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {cars.map(car => (
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
                          <p className="text-xl font-bold text-primary">₺{car.monthlyEarnings}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                          <span className="font-semibold">{car.rating}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {car.nextBooking}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button className="flex-1" variant="outline" size="sm">
                          Düzenle
                        </Button>
                        <Button className="flex-1" variant="outline" size="sm">
                          Detaylar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="rentals" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tüm Kiralamalar</CardTitle>
                  <CardDescription>Geçmiş ve aktif kiralama işlemleri</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentRentals.map(rental => (
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

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
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
                            <p className="font-semibold text-sm text-primary">₺{rental.amount}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Değerlendirme</p>
                            <div className="flex items-center gap-1">
                              {rental.rating ? (
                                <>
                                  <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                                  <span className="font-semibold text-sm">{rental.rating}</span>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">Bekleniyor</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Detayları Gör</Button>
                          {rental.status === "completed" && (
                            <Button variant="outline" size="sm">Fatura İndir</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
