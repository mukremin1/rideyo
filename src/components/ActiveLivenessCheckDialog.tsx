import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import * as blazeface from "@tensorflow-models/blazeface";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-backend-cpu";
import * as tf from "@tensorflow/tfjs-core";

interface ActiveLivenessCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (selfieDataUrl: string) => void;
  onFailure?: (message: string) => void;
}

type NativeFaceDetector = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
};

const getNativeFaceDetector = (): NativeFaceDetector | null => {
  const ctor = (window as unknown as { FaceDetector?: new (opts?: object) => NativeFaceDetector }).FaceDetector;
  if (!ctor) return null;
  try {
    return new ctor({ fastMode: true, maxDetectedFaces: 1 });
  } catch {
    return null;
  }
};

const ActiveLivenessCheckDialog = ({ open, onOpenChange, onSuccess, onFailure }: ActiveLivenessCheckDialogProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const blazeModelRef = useRef<blazeface.BlazeFaceModel | null>(null);
  const nativeDetectorRef = useRef<NativeFaceDetector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const detectingRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("Kamera hazırlanıyor…");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);

  const cleanup = useCallback(async () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }, []);

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return "";

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.88);
  };

  const completeLiveness = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const selfie = captureSelfie();
    onSuccess(selfie);
    void cleanup().finally(() => onOpenChange(false));
  }, [cleanup, onOpenChange, onSuccess]);

  const videoReady = (video: HTMLVideoElement) =>
    video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2;

  const detectFace = useCallback(async (video: HTMLVideoElement): Promise<boolean> => {
    if (nativeDetectorRef.current) {
      try {
        const faces = await nativeDetectorRef.current.detect(video);
        if (faces.length > 0) return true;
      } catch {
        // fall through to BlazeFace
      }
    }

    if (blazeModelRef.current) {
      const faces = await blazeModelRef.current.estimateFaces(video, false, true);
      return faces.length > 0;
    }

    return false;
  }, []);

  const runDetectionLoop = useCallback(() => {
    intervalRef.current = window.setInterval(() => {
      if (completedRef.current || detectingRef.current) return;

      const video = videoRef.current;
      if (!video || !videoReady(video)) return;

      detectingRef.current = true;
      void detectFace(video)
        .then((found) => {
          if (found && !completedRef.current) {
            setFaceDetected(true);
            setStatusText("Yüz algılandı, onaylanıyor…");
            completeLiveness();
          }
        })
        .catch(() => {
          // next tick
        })
        .finally(() => {
          detectingRef.current = false;
        });
    }, 450);
  }, [completeLiveness, detectFace]);

  useEffect(() => {
    if (!open) {
      void cleanup();
      setErrorMessage(null);
      setLoading(false);
      setInitialized(false);
      setFaceDetected(false);
      setStatusText("Kamera hazırlanıyor…");
      return;
    }

    completedRef.current = false;
    detectingRef.current = false;
    setErrorMessage(null);
    setLoading(true);
    setStatusText("Kamera hazırlanıyor…");

    const init = async () => {
      try {
        await tf.setBackend("webgl");
        await tf.ready();
      } catch {
        await tf.setBackend("cpu");
        await tf.ready();
      }

      nativeDetectorRef.current = getNativeFaceDetector();

      if (!blazeModelRef.current) {
        setStatusText("Yüz tanıma modeli yükleniyor…");
        blazeModelRef.current = await blazeface.load({
          maxFaces: 1,
          scoreThreshold: 0.35,
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("Kamera baslatilamadi.");
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      await video.play();

      await new Promise<void>((resolve) => {
        if (videoReady(video)) {
          resolve();
          return;
        }
        const onReady = () => {
          video.removeEventListener("loadeddata", onReady);
          resolve();
        };
        video.addEventListener("loadeddata", onReady);
      });

      timeoutRef.current = window.setTimeout(() => {
        if (!completedRef.current) {
          setErrorMessage("Otomatik algılama başarısız. Alttaki butonla onaylayın veya tekrar deneyin.");
        }
      }, 25000);

      setInitialized(true);
      setLoading(false);
      setStatusText(
        nativeDetectorRef.current
          ? "Yüzünüzü çerçeveye getirin"
          : "Yüzünüzü çerçeveye getirin (algılanınca otomatik onaylanır)",
      );
      runDetectionLoop();
    };

    void init().catch((error: unknown) => {
      setLoading(false);
      setInitialized(false);
      let message = error instanceof Error ? error.message : "Canlılık kontrolü başlatılamadı.";
      if (message.includes("NotAllowed") || message.includes("Permission")) {
        message = "Kamera izni reddedildi. Ayarlardan Rideyo için kamera iznini açın.";
      }
      setErrorMessage(message);
      onFailure?.(message);
    });

    return () => {
      void cleanup();
    };
  }, [cleanup, onFailure, open, runDetectionLoop]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Canlılık Kontrolü
          </DialogTitle>
          <DialogDescription>
            Yüzünüzü çerçeveye getirin — algılandığı anda doğrulama tamamlanır.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-lg border bg-black">
            <video ref={videoRef} className="h-64 w-full object-cover scale-x-[-1]" muted playsInline autoPlay />
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            ) : null}
            {!loading && initialized ? (
              <div className="pointer-events-none absolute inset-4 rounded-lg border-2 border-dashed border-white/70" />
            ) : null}
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`h-4 w-4 ${faceDetected ? "text-green-500" : "text-primary"}`} />
              <span>{statusText}</span>
            </div>
          </div>

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            className="w-full"
            disabled={!initialized || loading}
            onClick={() => completeLiveness()}
          >
            Yüzüm görünüyor — Onayla
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              onFailure?.("Canlılık kontrolü iptal edildi.");
              onOpenChange(false);
            }}
          >
            İptal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ActiveLivenessCheckDialog;
