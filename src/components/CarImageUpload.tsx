import { useState, useRef } from "react";
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
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Lütfen bir resim dosyası seçin");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu 5MB'dan küçük olmalıdır");
      return;
    }

    setUploading(true);

    try {
      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('car-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error("Upload error:", error);
        toast.error("Fotoğraf yüklenirken hata oluştu");
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('car-images')
        .getPublicUrl(data.path);

      setPreviewUrl(urlData.publicUrl);
      onImageUploaded(urlData.publicUrl);
      toast.success("Fotoğraf başarıyla yüklendi");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Fotoğraf yüklenirken hata oluştu");
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
            alt="Araç fotoğrafı"
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
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Image className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium">Araç Fotoğrafı Yükle</p>
                <p className="text-sm text-muted-foreground">PNG, JPG veya WEBP (max. 5MB)</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2">
                <Upload className="h-4 w-4 mr-2" />
                Fotoğraf Seç
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CarImageUpload;
