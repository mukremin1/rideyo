import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X, Image, Loader2 } from "lucide-react";

interface CarImageUploadProps {
  onImageUploaded: (url: string) => void;
  currentImageUrl?: string;
  userId: string;
}

const CarImageUpload = ({ onImageUploaded, currentImageUrl, userId }: CarImageUploadProps) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("components.carImageUpload.invalidFile"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("components.carImageUpload.fileTooLarge"));
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("car-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Upload error:", error);
        toast.error(t("components.carImageUpload.uploadError"));
        return;
      }

      const { data: urlData } = supabase.storage
        .from("car-images")
        .getPublicUrl(data.path);

      setPreviewUrl(urlData.publicUrl);
      onImageUploaded(urlData.publicUrl);
      toast.success(t("components.carImageUpload.uploadSuccess"));
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(t("components.carImageUpload.uploadError"));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setPreviewUrl(null);
    onImageUploaded("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt={t("components.carImageUpload.altText")}
            className="w-full h-48 object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={removeImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">{t("components.carImageUpload.uploading")}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Image className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium">{t("components.carImageUpload.uploadTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("components.carImageUpload.uploadHint")}</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2">
                <Upload className="h-4 w-4 mr-2" />
                {t("components.carImageUpload.selectPhoto")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CarImageUpload;
