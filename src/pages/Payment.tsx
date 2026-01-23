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
  CheckCircle,
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
import { tr } from "date-fns/locale";
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
  const [loading, setLoading] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedSavedCardId, setSelectedSavedCardId] = useState<string | null>(null);
  const [loadingSavedCards, setLoadingSavedCards] = useState(false);

  const state = location.state as PaymentState | null;

  const bookingId = state?.bookingId;
  const carName = state?.carName || "Araç";
  const totalPrice = state?.totalPrice || 0;
  const rentalType = state?.rentalType || "hour";
  const startTime = state?.startTime ? new Date(state.startTime) : new Date();
  const endTime = state?.endTime ? new Date(state.endTime) : new Date();
  const defaultProvisionFee = rentalType === "day" ? 350 : 300;
  const provisionFee = state?.provisionFee ?? defaultProvisionFee;
  const insurancePrice = state?.insurancePrice ?? 0;
  const kmPackageLabel = state?.kmPackageLabel;
  const kmPackagePrice = state?.kmPackagePrice ?? 0;
  const rentalAmount = state?.rentalAmount ?? Math.max(0, totalPrice - insurancePrice - provisionFee - kmPackagePrice);

  const [cardData, setCardData] = useState({
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    cvv: "",
  });

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
        toast.error("Kayıtlı kartlar yüklenemedi");
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

  const faqs = [
    {
      id: "payment-methods",
      question: "Hangi ödeme yöntemlerini kabul ediyorsunuz?",
      answer:
        "Visa, Mastercard ve Troy kartlarını kabul ediyoruz. Yakında mobil cüzdan desteği de eklenecek.",
    },
    {
      id: "refunds",
      question: "Provizyon ücreti ne zaman iade edilir?",
      answer:
        "Dakikalık kiralamalarda provizyon ücreti, kiralama bittiğinde ve herhangi bir ceza yoksa aynı gün içinde iade edilir.",
    },
    {
      id: "security",
      question: "Ödeme bilgilerim güvende mi?",
      answer:
        "Kart bilgileriniz SSL ile şifrelenir ve ödeme sağlayıcısı üzerinden güvenli şekilde işlenir.",
    },
    {
      id: "invoice",
      question: "Fatura bilgilerini nereden görebilirim?",
      answer:
        "Ödeme tamamlandıktan sonra e-posta adresinize fatura gönderilir. Ayrıca profilinizden geçmiş ödemeleri görebilirsiniz.",
    },
  ];

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
    if (selectedSavedCardId) return true;
    const cardNumber = cardData.cardNumber.replace(/\s/g, "");
    if (cardNumber.length < 16) {
      toast.error("Geçerli bir kart numarası girin");
      return false;
    }
    if (cardData.cardHolder.length < 3) {
      toast.error("Kart sahibinin adını girin");
      return false;
    }
    if (cardData.expiryDate.length < 5) {
      toast.error("Geçerli bir son kullanma tarihi girin");
      return false;
    }
    if (cardData.cvv.length < 3) {
      toast.error("Geçerli bir CVV girin");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCard()) return;

    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (bookingId && user) {
        await supabase.from("bookings").update({ payment_status: "paid" }).eq("id", bookingId);
      }

      if (saveCard && user && !selectedSavedCardId) {
        const expiry = parseExpiry(cardData.expiryDate);
        if (!expiry) {
          toast.error("Geçerli bir son kullanma tarihi girin");
          setLoading(false);
          return;
        }

        const cardType = getCardType() || "unknown";
        const lastFour = cardData.cardNumber.replace(/\s/g, "").slice(-4);

        const { error } = await supabase.from("saved_cards").insert({
          user_id: user.id,
          card_holder_name: cardData.cardHolder,
          card_type: cardType,
          expiry_month: expiry.month,
          expiry_year: expiry.year,
          last_four_digits: lastFour,
          encrypted_card_token: `demo-token-${Date.now()}`,
        });

        if (error) {
          toast.error("Kart kaydedilemedi");
        } else {
          toast.success("Kart kaydedildi");
        }
      }

      setPaymentSuccess(true);
      toast.success("Ödeme başarıyla tamamlandı!");

      setTimeout(() => {
        navigate("/start-rental", {
          state: {
            bookingId,
            carId: state?.carId,
            carName,
          },
        });
      }, 2000);
    } catch (error) {
      console.error("Ödeme hatası:", error);
      toast.error("Ödeme işlemi başarısız oldu");
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast.error("Lütfen tüm iletişim alanlarını doldurun.");
      return;
    }
    toast.success("Mesajınız alındı, kısa sürede dönüş yapacağız.");
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
    const typeLabel = card.card_type ? card.card_type.toUpperCase() : "KART";
    const expiry = `${String(card.expiry_month).padStart(2, "0")}/${String(card.expiry_year).slice(-2)}`;
    return `${typeLabel} •••• ${card.last_four_digits} • ${expiry}`;
  };

  const getRentalTypeText = (type: string) => {
    switch (type) {
      case "minute":
        return "Dakikalık";
      case "hour":
        return "Saatlik";
      case "day":
        return "Günlük";
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
              <h1 className="text-2xl font-bold text-foreground mb-4">Ödeme Bilgisi Bulunamadı</h1>
              <p className="text-muted-foreground mb-6">
                Ödeme yapmak için önce bir araç seçip rezervasyon yapmanız gerekmektedir.
              </p>
              <Button onClick={() => navigate("/cars")}>Araçlara Git</Button>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg">
            <Card className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Ödeme Başarılı!</h1>
              <p className="text-muted-foreground mb-4">{carName} için ödemeniz başarıyla tamamlandı.</p>
              <p className="text-3xl font-bold text-primary mb-6">{totalPrice.toFixed(2)}₺</p>
              <p className="text-sm text-muted-foreground">
                Şimdi kiralamayı başlatma ekranına yönlendiriliyorsunuz...
              </p>
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
            Geri Dön
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-start">
            <section>
              <h1 className="text-3xl font-bold text-foreground mb-2">Ödeme</h1>
              <p className="text-muted-foreground mb-8">{carName} için güvenli ödeme yapın</p>

              <Card className="p-6 mb-6">
                <h2 className="font-semibold text-foreground mb-4">Rezervasyon Özeti</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Araç</span>
                    <span className="font-medium">{carName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Kiralama Türü</span>
                    <span className="font-medium">{getRentalTypeText(rentalType)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Başlangıç</span>
                    </div>
                    <span className="font-medium text-sm">
                      {format(startTime, "dd MMM yyyy HH:mm", { locale: tr })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Bitiş</span>
                    </div>
                    <span className="font-medium text-sm">
                      {format(endTime, "dd MMM yyyy HH:mm", { locale: tr })}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 mb-6 bg-primary/5 border-primary/20">
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-muted-foreground">Kiralama Tutarı</span>
                    <span className="font-semibold text-primary">{rentalAmount.toFixed(2)}₺</span>
                  </div>
                  {kmPackageLabel && (
                    <div className="flex justify-between items-center pb-2 border-b border-border">
                      <span className="text-muted-foreground">KM Paketi</span>
                      <span className="font-semibold text-primary">
                        {kmPackageLabel} • {kmPackagePrice.toFixed(2)}₺
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pb-2 border-b border-border">
                    <span className="text-muted-foreground">Provizyon Ücreti</span>
                    <span className="font-semibold text-primary">{provisionFee}₺</span>
                  </div>
                  {rentalType === "day" && insurancePrice > 0 && (
                    <div className="flex justify-between items-center pb-2 border-b border-border">
                      <span className="text-muted-foreground">Sigorta Ücreti</span>
                      <span className="font-semibold text-primary">{insurancePrice}₺</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Toplam Tutar</p>
                      {rentalType === "minute" && (
                        <p className="text-xs text-muted-foreground">
                          Provizyon ücreti kiralama sonrası iade edilir
                        </p>
                      )}
                    </div>
                    <p className="text-3xl font-bold text-primary">{totalPrice.toFixed(2)}₺</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground mt-4">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">256-bit SSL</span>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Ödeme Yöntemlerim</h2>
                </div>

                {loadingSavedCards ? (
                  <p className="text-sm text-muted-foreground">Kayıtlı kartlar yükleniyor...</p>
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
                          <span className="text-xs text-primary font-semibold">Varsayılan</span>
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
                        Yeni kart kullan
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Kayıtlı kart bulunamadı. Aşağıdan yeni kart ekleyin.</p>
                )}
              </Card>

              <Card className="p-6 mt-6">
                <div className="flex items-center gap-2 mb-6">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Kart Bilgileri</h2>
                </div>
                {selectedSavedCardId && (
                  <p className="text-sm text-muted-foreground mb-4">
                    Kayıtlı kartla ödeme yapıyorsunuz. Yeni kart kullanmak için yukarıdan seçim kaldırın.
                  </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Kart Numarası</Label>
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
                    <Label htmlFor="cardHolder">Kart Sahibinin Adı</Label>
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
                      <Label htmlFor="expiry">Son Kullanma Tarihi</Label>
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
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        type="password"
                        placeholder="***"
                        value={cardData.cvv}
                        onChange={handleCvvChange}
                        disabled={Boolean(selectedSavedCardId)}
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
                      Kart bilgilerimi gelecek ödemeler için kaydet
                    </Label>
                  </div>

                  <div className="pt-4">
                    <Button type="submit" className="w-full h-12" disabled={loading}>
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          İşleniyor...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          {totalPrice.toFixed(2)}₺ Öde
                        </span>
                      )}
                    </Button>
                  </div>
                </form>

                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center justify-center gap-6 text-muted-foreground">
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4" />
                      <span>3D Secure</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Lock className="w-4 h-4" />
                      <span>SSL Korumalı</span>
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
                Ödeme yaparak{" "}
                <Link to="/rental-agreement" className="text-primary hover:underline">
                  Kiralama Sözleşmesi
                </Link>{" "}
                ve{" "}
                <Link to="/cancellation-policy" className="text-primary hover:underline">
                  İptal/İade Koşullarını
                </Link>{" "}
                kabul etmiş olursunuz.
              </p>
            </section>

            <aside className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">7/24 Destek</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Ödeme sırasında takıldığınız noktalar için destek ekibimiz her zaman yanınızda.
                </p>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>0850 000 00 00</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>destek@tiktak.com</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>İstanbul, Türkiye</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ClockIcon className="w-4 h-4" />
                    <span>Yanıt süresi: 10 dk</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Hızlı İletişim</h2>
                </div>
                <form onSubmit={handleContactSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="contactName">Ad Soyad</Label>
                    <Input
                      id="contactName"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Adınız"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="contactEmail">E-posta</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="ornek@email.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="contactMessage">Mesajınız</Label>
                    <Textarea
                      id="contactMessage"
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      placeholder="Size nasıl yardımcı olabiliriz?"
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Gönder
                  </Button>
                </form>
              </Card>
            </aside>
          </div>

          <section className="mt-10">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Sık Sorulan Sorular</h2>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
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
