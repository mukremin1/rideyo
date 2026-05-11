import { useState } from "react";
import { useToast } from "./use-toast";

interface CameraPhoto {
  dataUrl: string;
  format: string;
}

export const useCamera = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const { toast } = useToast();

  const capturePhoto = async (enableFlash = false): Promise<CameraPhoto | null> => {
    setIsCapturing(true);

    try {
      const isCapacitor = "Capacitor" in window;

      if (isCapacitor) {
        const { Camera } = await import("@capacitor/camera");
        const { CameraResultType, CameraSource } = await import("@capacitor/camera");

        const cameraOptions = {
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          flash: enableFlash ? "on" : "auto",
        };

        const photo = await Camera.getPhoto(cameraOptions as Parameters<typeof Camera.getPhoto>[0]);

        return {
          dataUrl: photo.dataUrl || "",
          format: photo.format,
        };
      }

      return await new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.capture = "environment";

        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            resolve(null);
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              dataUrl: String(reader.result ?? ""),
              format: file.type,
            });
          };
          reader.readAsDataURL(file);
        };

        input.click();
      });
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "Kamera Hatası",
        description: "Fotoğraf çekilemedi. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  return {
    capturePhoto,
    isCapturing,
  };
};
