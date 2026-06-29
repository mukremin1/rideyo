import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { WifiOff, Wifi } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

const OfflineIndicator = () => {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowAlert(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showAlert) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-slide-down">
      <Alert className={isOnline ? "bg-primary/10 border-primary" : "bg-destructive/10 border-destructive"}>
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-primary" />
          ) : (
            <WifiOff className="w-5 h-5 text-destructive" />
          )}
          <AlertDescription className={isOnline ? "text-primary" : "text-destructive"}>
            {isOnline ? t("components.offlineIndicator.online") : t("components.offlineIndicator.offline")}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
};

export default OfflineIndicator;
