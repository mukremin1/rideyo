import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CreditCard,
  Lock,
  Shield,
  ArrowLeft,
  Calendar,
  Clock,
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  Clock as ClockIcon,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/hooks/useDateLocale";
import { isBookingPaid } from "@/lib/paymentStatus";
import { invokeEdgeFunction, createSupabaseInvoker } from "@/lib/serverApi";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PaymentState {
  bookingId: string;
  carId: string;
  carName: string;
  totalPrice: number;
  rentalType: string;
  startTime: string;
  endTime: string;
  rentalAmount?: number;
  kmPackageLabel?: string;
  kmPackagePrice?: number;
  insurancePrice?: number;
  provisionFee?: number;
  additionalDriverFee?: number;
  additionalDriverName?: string;
}

interface SavedCard {
  id: string;
  card_holder_name: string;
  card_type: string;
  expiry_month: number;
  expiry_year: number;
  last_four_digits: string;
  is_default: boolean | null;
}

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [loading, setLoading] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedSavedCardId, setSelectedSavedCardId] = useState<string | null>(null);
  const [loadingSavedCards, setLoadingSavedCards] = useState(false);
  const [bookingValidationLoading, setBookingValidationLoading] = useState(true);
  const [bookingValidated, setBookingValidated] = useState(false);

  const state = location.state as PaymentState | null;

  const bookingId = state?.bookingId;
  const carName = state?.carName || t("payment.defaultCarName");
  const totalPrice = state?.totalPrice || 0;
  const rentalType = state?.rentalType || "hour";
  const startTime = state?.startTime ? new Date(state.startTime) : new Date();
  const endTime = state?.endTime ? new Date(state.endTime) : new Date();
  const defaultProvisionFee = rentalType === "day" ? 350 : 300;
  const provisionFee = state?.provisionFee ?? defaultProvisionFee;
  const insurancePrice = state?.insurancePrice ?? 0;
  const kmPackageLabel = state?.kmPackageLabel;
  const kmPackagePrice = state?.kmPackagePrice ?? 0;
  const additionalDriverFee = state?.additionalDriverFee ?? 0;
  const additionalDriverName = state?.additionalDriverName;
  const rentalAmount = state?.rentalAmount ?? Math.max(
    0,
    totalPrice - insurancePrice - provisionFee - kmPackagePrice - additionalDriverFee,
  );

  const [cardData, setCardData] = useState({
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    cvv: "",
  });

  const goToStartRental = () => {
    if (!bookingId) return;
    navigate(`/start-rental?bookingId=${bookingId}`, {
      replace: true,
      state: {
        bookingId,
        carId: state?.carId,
        carName,
      },
    });
  };

  useEffect(() => {
    if (!user) return;

    const fetchSavedCards = async () => {
      setLoadingSavedCards(true);
      const { data, error } = await supabase
        .from("saved_cards")
        .select("id, card_holder_name, card_type, expiry_month, expiry_year, last_four_digits, is_default")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error(t("payment.savedCardsLoadError"));
      } else {
        setSavedCards(data || []);
        const defaultCard = (data || []).find((card) => card.is_default);
        if (defaultCard) {
          setSelectedSavedCardId(defaultCard.id);
        }
      }
      setLoadingSavedCards(false);
    };

    fetchSavedCards();
  }, [user]);

  useEffect(() => {
    const validateBooking = async () => {
      if (!user || !bookingId) {
        setBookingValidated(false);
        setBookingValidationLoading(false);
        return;
      }

      setBookingValidationLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("id, user_id, payment_status")
        .eq("id", bookingId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        toast.error(t("payment.validationFailed"));
        setBookingValidated(false);
        setBookingValidationLoading(false);
        navigate("/cars");
        return;
      }

      if (isBookingPaid(data.payment_status)) {
        toast.message(t("payment.alreadyPaid"));
        navigate(`/start-rental?bookingId=${bookingId}`, {
          replace: true,
          state: {
            bookingId,
            carId: state?.carId,
            carName,
          },
        });
        return;
      }

      setBookingValidated(true);
      setBookingValidationLoading(false);
    };

    void validateBooking();
  }, [bookingId, carName, navigate, state?.carId, user]);

  const faqIds = ["payment-methods", "refunds", "security", "invoice"] as const;

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    }
    return value;
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, "").length <= 16) {
      setCardData({ ...cardData, cardNumber: formatted });
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value.replace("/", ""));
    if (formatted.replace("/", "").length <= 4) {
      setCardData({ ...cardData, expiryDate: formatted });
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9]/gi, "");
    if (v.length <= 4) {
      setCardData({ ...cardData, cvv: v });
    }
  };

  const validateCard = () => {
    if (selectedSavedCardId) {
      if (cardData.cvv.length < 3) {
        toast.error(t("payment.validation.savedCardCvv"));
        return false;
      }
      return true;
    }
    const cardNumber = cardData.cardNumber.replace(/\s/g, "");
    if (cardNumber.length < 16) {
      toast.error(t("payment.validation.cardNumber"));
      return false;
    }
    if (cardData.cardHolder.length < 3) {
      toast.error(t("payment.validation.cardHolder"));
      return false;
    }
    if (cardData.expiryDate.length < 5) {
      toast.error(t("payment.validation.expiry"));
      return false;
    }
    if (cardData.cvv.length < 3) {
      toast.error(t("payment.validation.cvv"));
      return false;
    }
    return true;
  };

  const parseExpiry = (value: string) => {
    const [monthRaw, yearRaw] = value.split("/");
    const month = Number(monthRaw);
    const year = Number(`20${yearRaw}`);
    if (!month || !year || month < 1 || month > 12 || yearRaw?.length !== 2) {
      return null;
    }
    return { month, year };
  };

  const launch3DS = (threeDSHtmlContent: string) => {
    try {
      const decoded = atob(threeDSHtmlContent);
      const iframe = document.createElement("iframe");
      iframe.name = "iyzico-3ds-frame";
      iframe.style.cssText = "position:fixed;inset:0;width:100%;height:100%;border:none;z-index:9999;background:#fff;";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
      if (!doc) throw new Error(t("payment.threeDSWindowError"));
      doc.open();
      doc.write(decoded);
      doc.close();
    } catch {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(atob(threeDSHtmlContent));
        win.document.close();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !bookingId || !bookingValidated) {
      toast.error(t("payment.validationBookingFailed"));
      return;
    }

    if (!validateCard()) return;

    if (!selectedSavedCardId) {
      const expiry = parseExpiry(cardData.expiryDate);
      if (!expiry) {
        toast.error(t("payment.validation.expiry"));
        return;
      }
    }

    setLoading(true);

    try {
      const expiry = selectedSavedCardId ? null : parseExpiry(cardData.expiryDate);
      const cardPayload = selectedSavedCardId
        ? { savedCardId: selectedSavedCardId, cvc: cardData.cvv }
        : {
            card: {
              cardHolder: cardData.cardHolder,
              cardNumber: cardData.cardNumber.replace(/\s/g, ""),
              expireMonth: expiry!.month.toString().padStart(2, "0"),
              expireYear: expiry!.year.toString().slice(-2),
              cvc: cardData.cvv,
            },
            saveCard,
          };

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error(t("payment.sessionNotFound"));
      }

      const { data: paymentResult, error: paymentError } = await invokeEdgeFunction(
        "process-payment",
        {
          bookingId,
          ...cardPayload,
        },
        session.access_token,
        (name, options) =>
          supabase.functions.invoke(name, options).then((r) => ({
            data: r.data as Record<string, unknown> | null,
            error: r.error,
          })),
      );

      if (paymentError || !paymentResult?.success) {
        throw new Error(
          paymentResult?.error || paymentError?.message || t("payment.paymentProcessFailed"),
        );
      }

      if (paymentResult.requires3DS && paymentResult.threeDSHtmlContent) {
        toast.message(t("payment.redirect3ds"));
        launch3DS(paymentResult.threeDSHtmlContent as string);
        return;
      }

      toast.success(t("payment.success"));
      goToStartRental();
    } catch (error) {
      console.error("Ödeme hatası:", error);
      toast.error(error instanceof Error ? error.message : t("payment.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error(t("payment.contactFieldsRequired"));
      return;
    }
    toast.success(t("payment.contactSuccess"));
    setContactForm({ name: "", email: "", message: "" });
  };

  const getCardType = () => {
    const cardNumber = cardData.cardNumber.replace(/\s/g, "");
    if (cardNumber.startsWith("4")) return "visa";
    if (cardNumber.startsWith("5")) return "mastercard";
    if (cardNumber.startsWith("9")) return "troy";
    return null;
  };

  const formatSavedCardLabel = (card: SavedCard) => {
    const typeLabel = card.card_type ? card.card_type.toUpperCase() : t("payment.cardLabel");
    const expiry = `${String(card.expiry_month).padStart(2, "0")}/${String(card.expiry_year).slice(-2)}`;
    return `${typeLabel} •••• ${card.last_four_digits} • ${expiry}`;
  };

  const getRentalTypeText = (type: string) => {
    switch (type) {
      case "minute":
        return t("payment.typeMinute");
      case "hour":
        return t("payment.typeHour");
      case "day":
        return t("payment.typeDay");
      default:
        return type;
    }
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg text-center">
            <Card className="p-8">
              <h1 className="text-2xl font-bold text-foreground mb-4">{t("payment.noInfo")}</h1>
              <p className="text-muted-foreground mb-6">{t("payment.noInfoDesc")}</p>
              <Button onClick={() => navigate("/cars")}>{t("common.goToCars")}</Button>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg text-center">
            <Card className="p-8">
              <h1 className="text-2xl font-bold text-foreground mb-4">{t("payment.loginRequired")}</h1>
              <p className="text-muted-foreground mb-6">{t("payment.loginRequiredDesc")}</p>
              <Button onClick={() => navigate("/auth")}>{t("common.goToAuth")}</Button>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (bookingValidationLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg text-center">
            <Card className="p-8">
              <h1 className="text-xl font-semibold text-foreground mb-3">{t("payment.checking")}</h1>
              <p className="text-muted-foreground">{t("payment.checkingDesc")}</p>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <Link
            to="/cars"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t("common.back")}
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-start">
            <section>
              <h1 className="text-3xl font-bold text-foreground mb-2">{t("payment.title")}</h1>
              <p className="text-muted-foreground mb-8">{carName} {t("payment.subtitle")}</p>

              <Card className="p-6 mb-6">
                <h2 className="font-semibold text-foreground mb-4">{t("payment.bookingSummary")}</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("payment.car")}</span>
                    <span className="font-medium">{carName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t("payment.rentalType")}</span>
                    <span className="font-medium">{getRentalTypeText(rentalType)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{t("payment.start")}</span>
                    </div>
                    <span className="font-medium text-sm">
                      {format(startTime, "dd MMM yyyy HH:mm", { locale: dateLocale })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{t("payment.end")}</span>
                    </div>
                    <span className="font-medium text-sm">
                      {format(endTime, "dd MMM yyyy HH:mm", { locale: dateLocale })}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 mb-6 bg-primary/5 border-primary/20">
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-muted-foreground">{t("payment.rentalAmount")}</span>
                    <span className="font-semibold text-primary">{rentalAmount.toFixed(2)}₺</span>
                  </div>
                  {kmPackageLabel && (
                    <div className="flex justify-between items-center pb-2 border-b border-border">
                      <span className="text-muted-foreground">{t("payment.kmPackage")}</span>
                      <span className="font-semibold text-primary">
                        {kmPackageLabel} • {kmPackagePrice.toFixed(2)}₺
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-muted-foreground">{t("payment.provisionFee")}</span>
                    <span className="font-semibold text-primary">{provisionFee}₺</span>
                  </div>
                  {rentalType === "day" && insurancePrice > 0 && (
                    <div className="flex justify-between items-center pb-2 border-b border-border">
                      <span className="text-muted-foreground">{t("payment.insuranceFee")}</span>
                      <span className="font-semibold text-primary">{insurancePrice}₺</span>
                    </div>
                  )}
                  {additionalDriverFee > 0 && (
                    <div className="flex justify-between items-center pb-2 border-b border-border">
                      <span className="text-muted-foreground">
                        {t("payment.additionalDriver")}{additionalDriverName ? ` (${additionalDriverName})` : ""}
                      </span>
                      <span className="font-semibold text-primary">{additionalDriverFee.toFixed(2)}₺</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("payment.totalAmountLabel")}</p>
                      {rentalType === "minute" && (
                        <p className="text-xs text-muted-foreground">
                          {t("payment.provisionRefundNote")}
                        </p>
                      )}
                    </div>
                    <p className="text-3xl font-bold text-primary">{totalPrice.toFixed(2)}₺</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground mt-4">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">{t("payment.ssl256")}</span>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">{t("payment.paymentMethods")}</h2>
                </div>

                {loadingSavedCards ? (
                  <p className="text-sm text-muted-foreground">{t("payment.loadingSavedCards")}</p>
                ) : savedCards.length > 0 ? (
                  <div className="space-y-3">
                    {savedCards.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                          selectedSavedCardId === card.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                        onClick={() => setSelectedSavedCardId(card.id)}
                      >
                        <span className="text-sm font-medium">{formatSavedCardLabel(card)}</span>
                        {card.is_default && (
                          <span className="text-xs text-primary font-semibold">{t("payment.defaultCard")}</span>
                        )}
                      </button>
                    ))}
                    {selectedSavedCardId && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setSelectedSavedCardId(null)}
                      >
                        {t("payment.useNewCard")}
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t("payment.noSavedCards")}</p>
                )}
              </Card>

              <Card className="p-6 mt-6">
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">{t("payment.cardDetails")}</h2>
                </div>
                {selectedSavedCardId && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("payment.savedCardHint")}
                  </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">{t("payment.cardNumber")}</Label>
                    <div className="relative">
                      <Input
                        id="cardNumber"
                        placeholder="0000 0000 0000 0000"
                        value={cardData.cardNumber}
                        onChange={handleCardNumberChange}
                        className="pr-16"
                        disabled={Boolean(selectedSavedCardId)}
                        required
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                        {getCardType() === "visa" && (
                          <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">
                            VISA
                          </div>
                        )}
                        {getCardType() === "mastercard" && (
                          <div className="w-8 h-5 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">
                            MC
                          </div>
                        )}
                        {getCardType() === "troy" && (
                          <div className="w-8 h-5 bg-blue-800 rounded text-white text-xs flex items-center justify-center font-bold">
                            TROY
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardHolder">{t("payment.cardHolder")}</Label>
                    <Input
                      id="cardHolder"
                      placeholder="AD SOYAD"
                      value={cardData.cardHolder}
                      onChange={(e) => setCardData({ ...cardData, cardHolder: e.target.value.toUpperCase() })}
                      disabled={Boolean(selectedSavedCardId)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">{t("payment.expiry")}</Label>
                      <Input
                        id="expiry"
                        placeholder="AA/YY"
                        value={cardData.expiryDate}
                        onChange={handleExpiryChange}
                        disabled={Boolean(selectedSavedCardId)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">{t("payment.cvv")}</Label>
                      <Input
                        id="cvv"
                        type="password"
                        placeholder="***"
                        value={cardData.cvv}
                        onChange={handleCvvChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="saveCard"
                      checked={saveCard}
                      onCheckedChange={(checked) => setSaveCard(checked as boolean)}
                      disabled={Boolean(selectedSavedCardId)}
                    />
                    <Label htmlFor="saveCard" className="text-sm text-muted-foreground cursor-pointer">
                      {t("payment.saveCardForFuture")}
                    </Label>
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="w-full h-12 bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--accent)))] shadow-[0_12px_30px_-10px_hsl(var(--primary)/0.55)] hover:opacity-95"
                      disabled={loading || !bookingValidated}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {t("payment.processing")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          {t("payment.payAmount", { amount: totalPrice.toFixed(2) })}
                        </span>
                      )}
                    </Button>
                  </div>
                </form>

                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center justify-center gap-6 text-muted-foreground">
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4" />
                      <span>{t("payment.secure3ds")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Lock className="w-4 h-4" />
                      <span>{t("payment.sslProtected")}</span>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4 mt-4">
                    <div className="bg-white rounded px-2 py-1 shadow-sm">
                      <svg className="h-5 w-8" viewBox="0 0 48 32" fill="none">
                        <path d="M19.5 21.5H16.5L18.5 10.5H21.5L19.5 21.5Z" fill="#00579F" />
                        <path
                          d="M29 10.7C28.3 10.4 27.2 10.1 25.9 10.1C22.9 10.1 20.8 11.7 20.8 13.9C20.8 15.6 22.3 16.5 23.5 17.1C24.7 17.7 25.1 18.1 25.1 18.6C25.1 19.4 24.1 19.8 23.2 19.8C21.9 19.8 21.2 19.6 20.1 19.1L19.7 18.9L19.3 21.3C20.1 21.7 21.6 22 23.2 22C26.4 22 28.4 20.4 28.4 18C28.4 16.7 27.6 15.7 25.8 14.9C24.7 14.3 24 14 24 13.4C24 12.9 24.5 12.3 25.8 12.3C26.9 12.3 27.7 12.5 28.3 12.8L28.6 12.9L29 10.7Z"
                          fill="#00579F"
                        />
                      </svg>
                    </div>
                    <div className="bg-white rounded px-2 py-1 shadow-sm">
                      <svg className="h-5 w-8" viewBox="0 0 48 32" fill="none">
                        <circle cx="18" cy="16" r="8" fill="#EB001B" />
                        <circle cx="30" cy="16" r="8" fill="#F79E1B" />
                        <path
                          d="M24 10.5C25.9 12 27.1 14.3 27.1 16.9C27.1 19.5 25.9 21.8 24 23.3C22.1 21.8 20.9 19.5 20.9 16.9C20.9 14.3 22.1 12 24 10.5Z"
                          fill="#FF5F00"
                        />
                      </svg>
                    </div>
                    <div className="bg-white rounded px-2 py-1 shadow-sm">
                      <span className="text-xs font-bold text-blue-800">TROY</span>
                    </div>
                  </div>
                </div>
              </Card>

              <p className="text-center text-sm text-muted-foreground mt-6">
                {t("payment.termsPrefix")}{" "}
                <Link to="/rental-agreement" className="text-primary hover:underline">
                  {t("payment.rentalAgreement")}
                </Link>{" "}
                {t("payment.termsAnd")}{" "}
                <Link to="/cancellation-policy" className="text-primary hover:underline">
                  {t("payment.cancellationPolicy")}
                </Link>{" "}
                {t("payment.termsSuffix")}
              </p>
            </section>

            <aside className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">{t("payment.support247")}</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t("payment.supportDesc")}
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{t("payment.supportPhone")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{t("payment.supportEmail")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{t("payment.supportLocation")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ClockIcon className="w-4 h-4" />
                    <span>{t("payment.supportResponse")}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">{t("payment.quickContact")}</h2>
                </div>
                <form onSubmit={handleContactSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="contactName">{t("payment.contactName")}</Label>
                    <Input
                      id="contactName"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder={t("payment.contactNamePlaceholder")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="contactEmail">{t("payment.contactEmail")}</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder={t("payment.contactEmailPlaceholder")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="contactMessage">{t("payment.contactMessage")}</Label>
                    <Textarea
                      id="contactMessage"
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder={t("payment.contactMessagePlaceholder")}
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {t("payment.send")}
                  </Button>
                </form>
              </Card>
            </aside>
          </div>

          <section className="mt-10">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">{t("payment.faqTitle")}</h2>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {faqIds.map((faqId) => (
                  <AccordionItem key={faqId} value={faqId}>
                    <AccordionTrigger>{t(`payment.faqs.${faqId}.question`)}</AccordionTrigger>
                    <AccordionContent>{t(`payment.faqs.${faqId}.answer`)}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Payment;

