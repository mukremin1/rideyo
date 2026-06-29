import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Camera, Flashlight, FlashlightOff, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCamera } from "@/hooks/useCamera";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface VehicleDropoffPhotoProps {
  carId: string;
  bookingId: string;
  onPhotoTaken?: (photoData: string) => void;
}

const VehicleDropoffPhoto = ({ carId, bookingId, onPhotoTaken }: VehicleDropoffPhotoProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { capturePhoto } = useCamera();
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [isFlashEnabled, setIsFlashEnabled] = useState(false);
  const [isDarkEnvironment, setIsDarkEnvironment] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    checkLightConditions();
    return () => {
      stopCamera();
    };
  }, []);

  const checkLightConditions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        setTimeout(() => {
          analyzeBrightness();
        }, 1000);
      }
    } catch (error) {
      console.error("Kamera erişim hatası:", error);
    }
  };

  const analyzeBrightness = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let totalBrightness = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      totalBrightness += (r + g + b) / 3;
    }

    const avgBrightness = totalBrightness / (data.length / 4);
    
    if (avgBrightness < 80) {
      setIsDarkEnvironment(true);
      setIsFlashEnabled(true);
      toast({
        title: t("vehiclePhoto.darkDetected"),
        description: t("vehiclePhoto.flashAutoEnabled"),
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleTakePhoto = async () => {
    if (!user) {
      toast({
        title: t("vehiclePhoto.loginRequired"),
        description: t("vehiclePhoto.loginRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    try {
      const photo = await capturePhoto(isFlashEnabled);
      
      if (photo && photo.dataUrl) {
        const { error } = await supabase
          .from("vehicle_photos")
          .insert({
            booking_id: bookingId,
            car_id: carId,
            user_id: user.id,
            photo_type: "dropoff",
            photo_url: photo.dataUrl,
            is_dark_environment: isDarkEnvironment,
            flash_used: isFlashEnabled,
          });

        if (error) {
          console.error("Fotoğraf kaydetme hatası:", error);
          toast({
            title: t("vehiclePhoto.saveError"),
            description: t("vehiclePhoto.saveErrorDesc"),
            variant: "destructive",
          });
          return;
        }

        setPhotoData(photo.dataUrl);
        stopCamera();
        
        if (onPhotoTaken) {
          onPhotoTaken(photo.dataUrl);
        }

        toast({
          title: t("vehiclePhoto.photoTaken"),
          description: t("vehiclePhoto.dropoffSaved"),
        });
      }
    } catch (error) {
      console.error("Fotoğraf çekme hatası:", error);
      toast({
        title: t("common.error"),
        description: t("vehiclePhoto.captureError"),
        variant: "destructive",
      });
    }
  };

  const toggleFlash = () => {
    setIsFlashEnabled(!isFlashEnabled);
  };

  if (photoData) {
    return (
      <div className="space-y-4">
        <div className="relative rounded-xl overflow-hidden border-2 border-primary">
          <img src={photoData} alt={t("vehiclePhoto.dropoffAlt")} className="w-full" />
          <div className="absolute top-4 right-4">
            <CheckCircle className="w-8 h-8 text-primary bg-background rounded-full" />
          </div>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <p className="text-sm font-medium text-primary">
            {t("vehiclePhoto.dropoffSuccess")}
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setPhotoData(null);
            checkLightConditions();
          }}
        >
          {t("vehiclePhoto.retake")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">{t("vehiclePhoto.dropoffTitle")}</h3>
          {isDarkEnvironment && (
            <div className="flex items-center gap-2 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full">
              <Flashlight className="w-3 h-3" />
              {t("vehiclePhoto.darkEnvironment")}
            </div>
          )}
        </div>

        <div className="relative rounded-lg overflow-hidden bg-black mb-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video object-cover"
          />
          {isFlashEnabled && (
            <div className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <Flashlight className="w-3 h-3" />
              {t("vehiclePhoto.flashActive")}
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {t("vehiclePhoto.dropoffHint")}
          {isDarkEnvironment && t("vehiclePhoto.dropoffHintDark")}
        </p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={toggleFlash}
          >
            {isFlashEnabled ? (
              <>
                <Flashlight className="w-4 h-4" />
                {t("vehiclePhoto.flashOn")}
              </>
            ) : (
              <>
                <FlashlightOff className="w-4 h-4" />
                {t("vehiclePhoto.flashOff")}
              </>
            )}
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={handleTakePhoto}
          >
            <Camera className="w-4 h-4" />
            {t("vehiclePhoto.takePhoto")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VehicleDropoffPhoto;
