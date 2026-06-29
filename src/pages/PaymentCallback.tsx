import { useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const PaymentCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const status = params.get("status");
  const bookingId = params.get("bookingId");
  const message = params.get("message");
  const isSuccess = status === "success";
  const isError = status === "error";

  useEffect(() => {
    if (isSuccess && bookingId) {
      const timer = setTimeout(() => {
        navigate("/start-rental", { state: { bookingId }, replace: true });
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, bookingId, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-lg">
          <Card className="p-8 text-center">
            {!isSuccess && !isError && (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <h1 className="text-xl font-bold">Ödeme Doğrulanıyor</h1>
                <p className="text-muted-foreground mt-2">Lütfen bekleyin...</p>
              </>
            )}

            {isSuccess && (
              <>
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-foreground mb-2">Ödeme Başarılı</h1>
                <p className="text-muted-foreground">
                  Kiralama başlatma ekranına yönlendiriliyorsunuz...
                </p>
              </>
            )}

            {isError && (
              <>
                <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-foreground mb-2">Ödeme Başarısız</h1>
                <p className="text-muted-foreground mb-6">
                  {message ? decodeURIComponent(message) : "3D Secure doğrulaması tamamlanamadı."}
                </p>
                <div className="flex flex-col gap-3">
                  {bookingId && (
                    <Button onClick={() => navigate("/payment", { state: { bookingId } })}>
                      Tekrar Dene
                    </Button>
                  )}
                  <Button variant="outline" asChild>
                    <Link to="/my-bookings">Rezervasyonlarım</Link>
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentCallback;
