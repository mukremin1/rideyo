import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Car, Clock, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const AvailabilityCalendar = () => {
  const [selectedCar, setSelectedCar] = useState("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [blockReason, setBlockReason] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Mock data - gercek uygulamada API'den gelecek
  const cars: { id: string; name: string; plate: string }[] = [];
  const hasCars = cars.length > 0;

  const bookedDates = [
    new Date(2024, 10, 18),
    new Date(2024, 10, 19),
    new Date(2024, 10, 20),
    new Date(2024, 10, 25),
    new Date(2024, 10, 26)
  ];

  const blockedDates = [
    {
      date: new Date(2024, 10, 22),
      reason: "Periyodik bak?m",
      id: 1
    },
    {
      date: new Date(2024, 10, 23),
      reason: "Periyodik bak?m",
      id: 2
    }
  ];

  const upcomingBookings = [
    {
      id: 1,
      dates: "18-20 Kas 2024",
      renter: "Ahmet Y.",
      type: "G?nl?k",
      amount: "1.800"
    },
    {
      id: 2,
      dates: "25-26 Kas 2024",
      renter: "Zeynep K.",
      type: "G?nl?k",
      amount: "1.200"
    }
  ];

  const handleBlockDates = () => {
    if (selectedDates.length === 0) {
      toast.error("L?tfen en az bir tarih se?in");
      return;
    }
    if (!blockReason.trim()) {
      toast.error("L?tfen engelleme nedeni girin");
      return;
    }

    // API call yapilacak
    toast.success(`${selectedDates.length} g?n engellendi`);
    setSelectedDates([]);
    setBlockReason("");
    setIsDialogOpen(false);
  };

  const handleUnblockDate = (dateId: number) => {
    // API call yapilacak
    toast.success("Tarih engeli kald?r?ld?");
  };

  const isDateBooked = (date: Date) => {
    return bookedDates.some(d =>
      d.getDate() === date.getDate() &&
      d.getMonth() === date.getMonth() &&
      d.getFullYear() === date.getFullYear()
    );
  };

  const isDateBlocked = (date: Date) => {
    return blockedDates.some(d =>
      d.date.getDate() === date.getDate() &&
      d.date.getMonth() === date.getMonth() &&
      d.date.getFullYear() === date.getFullYear()
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3">M?saitlik Takvimi</h1>
            <p className="text-lg text-muted-foreground">
              Ara?lar?n?z?n m?sait olmad??? g?nleri y?netin
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Sol Panel - Takvim ve Kontroller */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Ara? Se?in</CardTitle>
                      <CardDescription>Takvimde g?rmek istedi?iniz arac? se?in</CardDescription>
                    </div>
                    <Car className="w-8 h-8 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  {hasCars ? (
                    <Select value={selectedCar} onValueChange={setSelectedCar}>
                      <SelectTrigger>
                        <SelectValue placeholder="Ara? se?in" />
                      </SelectTrigger>
                      <SelectContent>
                        {cars.map(car => (
                          <SelectItem key={car.id} value={car.id}>
                            {car.name} ({car.plate})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex flex-col items-start gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      <p>Hen?z kay?tl? arac?n?z yok. Takvim g?r?n?m? i?in ?nce ara? ekleyin.</p>
                      <Button asChild size="sm">
                        <Link to="/add-car">Ara? Ekle</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {hasCars && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5" />
                      Takvim
                    </CardTitle>
                    <CardDescription>
                      Tarih se?in ve m?saitli?i y?netin
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-primary rounded"></div>
                          <span className="text-sm">Rezerve</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-destructive rounded"></div>
                          <span className="text-sm">Engellenmi?</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary rounded"></div>
                          <span className="text-sm">Se?ili</span>
                        </div>
                      </div>

                      <Calendar
                        mode="multiple"
                        selected={selectedDates}
                        onSelect={(dates) => setSelectedDates(dates || [])}
                        disabled={(date) => isDateBooked(date) || date < new Date()}
                        className="rounded-md border w-full"
                        modifiers={{
                          booked: bookedDates,
                          blocked: blockedDates.map(d => d.date)
                        }}
                        modifiersStyles={{
                          booked: {
                            backgroundColor: "hsl(var(--primary))",
                            color: "white",
                            fontWeight: "bold"
                          },
                          blocked: {
                            backgroundColor: "hsl(var(--destructive))",
                            color: "white",
                            textDecoration: "line-through"
                          }
                        }}
                      />

                      {selectedDates.length > 0 && (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="w-full">
                              {selectedDates.length} G?n? Engelle
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Tarih Engelleme</DialogTitle>
                              <DialogDescription>
                                Se?ili tarihlerde ara? kiralamaya kapal? olacak
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Se?ili Tarihler</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {selectedDates.map((date, i) => (
                                    <Badge key={i} variant="secondary">
                                      {date.toLocaleDateString("tr-TR")}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="reason">Engelleme Nedeni</Label>
                                <Textarea
                                  id="reason"
                                  placeholder="?rn: Periyodik bak?m, ki?isel kullan?m"
                                  value={blockReason}
                                  onChange={(e) => setBlockReason(e.target.value)}
                                  className="mt-2"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={handleBlockDates} className="flex-1">
                                  Onayla
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setIsDialogOpen(false)}
                                  className="flex-1"
                                >
                                  ?ptal
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sag Panel - Bilgiler */}
            {hasCars && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Yakla?an Rezervasyonlar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {upcomingBookings.map(booking => (
                        <div key={booking.id} className="p-3 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-sm">{booking.dates}</p>
                              <p className="text-xs text-muted-foreground">{booking.renter}</p>
                            </div>
                            <Badge variant="secondary">{booking.type}</Badge>
                          </div>
                          <p className="text-sm font-semibold text-primary">?{booking.amount}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Engellenmi? Tarihler</CardTitle>
                    <CardDescription>
                      Kiralama i?in kapal? g?nler
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {blockedDates.map(blocked => (
                        <div key={blocked.id} className="p-3 border rounded-lg border-destructive/20 bg-destructive/5">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">
                                {blocked.date.toLocaleDateString("tr-TR")}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {blocked.reason}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnblockDate(blocked.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {blockedDates.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Engellenmi? tarih bulunmuyor
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-sm">Kullan?m ?pu?lar?</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-2">
                    <p>Bak?m veya ki?isel kullan?m i?in tarihleri engelleyebilirsiniz.</p>
                    <p>Rezerve edilmi? tarihler engellenemez.</p>
                    <p>Ge?mi? tarihler se?ilemez.</p>
                    <p>Bir tarihten engeli istedi?iniz zaman kald?rabilirsiniz.</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
};

export default AvailabilityCalendar;
