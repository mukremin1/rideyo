import { useState, useEffect, useCallback } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { eachDayOfInterval, format, parseISO, startOfDay } from "date-fns";
import { useDateLocale } from "@/hooks/useDateLocale";

type CarOption = { id: string; name: string; plate: string };

type BlockedDate = {
  id: string;
  date: Date;
  reason: string;
};

type UpcomingBooking = {
  id: string;
  dates: string;
  renter: string;
  type: string;
  amount: string;
};

const sameDay = (a: Date, b: Date) =>
  a.getDate() === b.getDate() &&
  a.getMonth() === b.getMonth() &&
  a.getFullYear() === b.getFullYear();

const AvailabilityCalendar = () => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { user, loading: authLoading } = useAuth();
  const [selectedCar, setSelectedCar] = useState("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [blockReason, setBlockReason] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const hasCars = cars.length > 0;

  const fetchCars = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("cars")
      .select("id, name, plate_number")
      .eq("owner_id", user.id)
      .order("name");

    const list = (data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      plate: c.plate_number ?? "—",
    }));
    setCars(list);
    if (list.length > 0 && !selectedCar) {
      setSelectedCar(list[0].id);
    }
  }, [user, selectedCar]);

  const fetchCarCalendar = useCallback(async (carId: string) => {
    if (!carId) return;

    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, start_time, end_time, total_price, rental_type, user_id, payment_status")
      .eq("car_id", carId)
      .in("payment_status", ["completed", "in_progress", "paid", "pending"])
      .gte("end_time", new Date().toISOString())
      .order("start_time");

    const dates: Date[] = [];
    for (const booking of bookings ?? []) {
      const days = eachDayOfInterval({
        start: parseISO(booking.start_time),
        end: parseISO(booking.end_time),
      });
      dates.push(...days);
    }
    setBookedDates(dates);

    const renterIds = [...new Set((bookings ?? []).map((b) => b.user_id))];
    const { data: profiles } = renterIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", renterIds)
      : { data: [] };
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? t("owner.common.renter")]));

    const rentalTypeLabel: Record<string, string> = {
      minute: t("owner.common.rentalTypes.minute"),
      hour: t("owner.common.rentalTypes.hour"),
      day: t("owner.common.rentalTypes.day"),
    };

    setUpcomingBookings(
      (bookings ?? []).slice(0, 5).map((b) => ({
        id: b.id,
        dates: `${format(parseISO(b.start_time), "d MMM", { locale: dateLocale })} - ${format(parseISO(b.end_time), "d MMM yyyy", { locale: dateLocale })}`,
        renter: profileMap.get(b.user_id) ?? t("owner.common.renter"),
        type: rentalTypeLabel[b.rental_type] ?? b.rental_type,
        amount: b.total_price.toLocaleString("tr-TR"),
      })),
    );

    const { data: blocked } = await supabase
      .from("car_blocked_dates")
      .select("id, blocked_date, reason")
      .eq("car_id", carId)
      .gte("blocked_date", format(new Date(), "yyyy-MM-dd"))
      .order("blocked_date");

    setBlockedDates(
      (blocked ?? []).map((row) => ({
        id: row.id,
        date: parseISO(row.blocked_date),
        reason: row.reason ?? t("owner.availability.blockedDefault"),
      })),
    );
  }, [t, dateLocale]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchCars().finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, fetchCars]);

  useEffect(() => {
    if (selectedCar) {
      fetchCarCalendar(selectedCar);
    }
  }, [selectedCar, fetchCarCalendar]);

  const handleBlockDates = async () => {
    if (!selectedCar) {
      toast.error(t("owner.availability.toast.selectCar"));
      return;
    }
    if (selectedDates.length === 0) {
      toast.error(t("owner.availability.toast.selectDate"));
      return;
    }
    if (!blockReason.trim()) {
      toast.error(t("owner.availability.toast.enterReason"));
      return;
    }

    const rows = selectedDates.map((date) => ({
      car_id: selectedCar,
      blocked_date: format(date, "yyyy-MM-dd"),
      reason: blockReason.trim(),
    }));

    const { error } = await supabase.from("car_blocked_dates").upsert(rows, {
      onConflict: "car_id,blocked_date",
    });

    if (error) {
      toast.error(t("owner.availability.toast.blockError"));
      return;
    }

    toast.success(t("owner.availability.toast.blockSuccess", { count: selectedDates.length }));
    setSelectedDates([]);
    setBlockReason("");
    setIsDialogOpen(false);
    fetchCarCalendar(selectedCar);
  };

  const handleUnblockDate = async (dateId: string) => {
    const { error } = await supabase.from("car_blocked_dates").delete().eq("id", dateId);
    if (error) {
      toast.error(t("owner.availability.toast.unblockError"));
      return;
    }
    toast.success(t("owner.availability.toast.unblockSuccess"));
    if (selectedCar) fetchCarCalendar(selectedCar);
  };

  const isDateBooked = (date: Date) => bookedDates.some((d) => sameDay(d, date));

  const isDateBlocked = (date: Date) => blockedDates.some((d) => sameDay(d.date, date));

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 pt-24 text-center text-muted-foreground">
          {t("owner.common.loading")}
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 pt-24 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3">{t("owner.availability.title")}</h1>
            <p className="text-lg text-muted-foreground">{t("owner.availability.subtitle")}</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{t("owner.availability.selectCar")}</CardTitle>
                      <CardDescription>{t("owner.availability.selectCarDesc")}</CardDescription>
                    </div>
                    <Car className="w-8 h-8 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  {hasCars ? (
                    <Select value={selectedCar} onValueChange={setSelectedCar}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("owner.availability.selectCarPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {cars.map((car) => (
                          <SelectItem key={car.id} value={car.id}>
                            {car.name} ({car.plate})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex flex-col items-start gap-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                      <p>{t("owner.availability.noCars")}</p>
                      <Button asChild size="sm">
                        <Link to="/add-car">{t("owner.availability.addCar")}</Link>
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
                      {t("owner.availability.calendar")}
                    </CardTitle>
                    <CardDescription>{t("owner.availability.calendarDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-primary rounded" />
                          <span className="text-sm">{t("owner.availability.legendBooked")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-destructive rounded" />
                          <span className="text-sm">{t("owner.availability.legendBlocked")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary rounded" />
                          <span className="text-sm">{t("owner.availability.legendSelected")}</span>
                        </div>
                      </div>

                      <Calendar
                        mode="multiple"
                        selected={selectedDates}
                        onSelect={(dates) => setSelectedDates(dates || [])}
                        disabled={(date) =>
                          isDateBooked(date) ||
                          isDateBlocked(date) ||
                          startOfDay(date) < startOfDay(new Date())
                        }
                        className="rounded-md border w-full"
                        modifiers={{
                          booked: bookedDates,
                          blocked: blockedDates.map((d) => d.date),
                        }}
                        modifiersStyles={{
                          booked: {
                            backgroundColor: "hsl(var(--primary))",
                            color: "white",
                            fontWeight: "bold",
                          },
                          blocked: {
                            backgroundColor: "hsl(var(--destructive))",
                            color: "white",
                            textDecoration: "line-through",
                          },
                        }}
                      />

                      {selectedDates.length > 0 && (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="w-full">
                              {t("owner.availability.blockDays", { count: selectedDates.length })}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{t("owner.availability.blockDialogTitle")}</DialogTitle>
                              <DialogDescription>{t("owner.availability.blockDialogDesc")}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>{t("owner.availability.selectedDates")}</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {selectedDates.map((date, i) => (
                                    <Badge key={i} variant="secondary">
                                      {date.toLocaleDateString("tr-TR")}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="reason">{t("owner.availability.blockReason")}</Label>
                                <Textarea
                                  id="reason"
                                  placeholder={t("owner.availability.blockReasonPlaceholder")}
                                  value={blockReason}
                                  onChange={(e) => setBlockReason(e.target.value)}
                                  className="mt-2"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button onClick={handleBlockDates} className="flex-1">
                                  {t("owner.common.confirm")}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setIsDialogOpen(false)}
                                  className="flex-1"
                                >
                                  {t("owner.common.cancel")}
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

            {hasCars && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      {t("owner.availability.upcomingBookings")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {upcomingBookings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("owner.availability.noUpcoming")}</p>
                    ) : (
                      <div className="space-y-3">
                        {upcomingBookings.map((booking) => (
                          <div key={booking.id} className="p-3 border rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-semibold text-sm">{booking.dates}</p>
                                <p className="text-xs text-muted-foreground">{booking.renter}</p>
                              </div>
                              <Badge variant="secondary">{booking.type}</Badge>
                            </div>
                            <p className="text-sm font-semibold text-primary">₺{booking.amount}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t("owner.availability.blockedDates")}</CardTitle>
                    <CardDescription>{t("owner.availability.blockedDatesDesc")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {blockedDates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("owner.availability.noBlocked")}</p>
                    ) : (
                      <div className="space-y-3">
                        {blockedDates.map((blocked) => (
                          <div
                            key={blocked.id}
                            className="p-3 border rounded-lg border-destructive/20 bg-destructive/5"
                          >
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
                      </div>
                    )}
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
