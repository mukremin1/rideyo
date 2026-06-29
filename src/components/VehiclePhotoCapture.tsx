import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Camera, X, Plus, Flashlight, FlashlightOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VehiclePhotoCaptureProps {
  onPhotosChange: (photos: string[]) => void;
  photos: string[];
  maxPhotos?: number;
}
type TorchCapableTrack = MediaStreamTrack & {
  getCapabilities: () => MediaTrackCapabilities & { torch?: boolean };
  applyConstraints: (constraints: MediaTrackConstraints & { advanced?: Array<{ torch?: boolean }> }) => Promise<void>;
};

const VehiclePhotoCapture = ({ onPhotosChange, photos, maxPhotos = 4 }: VehiclePhotoCaptureProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isFlashEnabled, setIsFlashEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCapturing(true);
      }
    } catch (error) {
      console.error("Kamera erişim hatası:", error);
      toast({
        title: t("vehiclePhoto.cameraError"),
        description: t("vehiclePhoto.cameraPermission"),
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    const newPhotos = [...photos, dataUrl];
    onPhotosChange(newPhotos);

    if (newPhotos.length >= maxPhotos) {
      stopCamera();
    }

    toast({
      title: t("vehiclePhoto.photoTaken"),
      description: t("vehiclePhoto.photoCount", { current: newPhotos.length, max: maxPhotos }),
    });
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const toggleFlash = async () => {
    if (!streamRef.current) return;

    const track = streamRef.current.getVideoTracks()[0] as TorchCapableTrack;
    const capabilities = track.getCapabilities();

    if (capabilities.torch) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: !isFlashEnabled }]
        });
        setIsFlashEnabled(!isFlashEnabled);
      } catch (error) {
        console.error("Flaş kontrolü hatası:", error);
      }
    } else {
      toast({
        title: t("vehiclePhoto.flashNotSupported"),
        description: t("vehiclePhoto.flashNotSupportedDesc"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo, index) => (
          <div key={index} className="relative aspect-video rounded-lg overflow-hidden border">
            <img src={photo} alt={t("vehiclePhoto.photoAlt", { index: index + 1 })} className="w-full h-full object-cover" />
            <button
              onClick={() => removePhoto(index)}
              className="absolute top-2 right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && !isCapturing && (
          <button
            onClick={startCamera}
            className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-8 h-8 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t("vehiclePhoto.addPhoto")}</span>
          </button>
        )}
      </div>

      {isCapturing && (
        <div className="relative rounded-lg overflow-hidden bg-black">
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

          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background/80 backdrop-blur-sm"
              onClick={toggleFlash}
            >
              {isFlashEnabled ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
            </Button>
            
            <Button
              size="lg"
              className="rounded-full w-16 h-16"
              onClick={capturePhoto}
            >
              <Camera className="w-6 h-6" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background/80 backdrop-blur-sm"
              onClick={stopCamera}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground text-center">
        {t("vehiclePhoto.photoHint", { current: photos.length, max: maxPhotos })}
      </p>
    </div>
  );
};

export default VehiclePhotoCapture;
