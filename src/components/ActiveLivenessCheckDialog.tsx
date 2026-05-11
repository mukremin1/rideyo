import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs-core";

type LivenessStep = "center" | "turn_left" | "turn_right" | "blink";

interface ActiveLivenessCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (selfieDataUrl: string) => void;
  onFailure?: (message: string) => void;
}

const STEP_LABELS: Record<LivenessStep, string> = {
  center: "Yuzunu merkeze getir",
  turn_left: "Basini sola cevir",
  turn_right: "Basini saga cevir",
  blink: "Bir kez goz kirp",
};

const STEP_ORDER: LivenessStep[] = ["center", "turn_left", "turn_right", "blink"];

const ActiveLivenessCheckDialog = ({ open, onOpenChange, onSuccess, onFailure }: ActiveLivenessCheckDialogProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  const blinkReadyRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const activeStep = useMemo(() => STEP_ORDER[activeStepIndex] ?? STEP_ORDER[STEP_ORDER.length - 1], [activeStepIndex]);

  const cleanup = useCallback(async () => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
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

  const pointDistance = useCallback((a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getEyeAspectRatio = useCallback(
    (keypoints: Array<{ x: number; y: number }>, upperIdx: number, lowerIdx: number, leftIdx: number, rightIdx: number) => {
      const upper = keypoints[upperIdx];
      const lower = keypoints[lowerIdx];
      const left = keypoints[leftIdx];
      const right = keypoints[rightIdx];
      if (!upper || !lower || !left || !right) return 1;

      const vertical = pointDistance(upper, lower);
      const horizontal = pointDistance(left, right);
      if (horizontal === 0) return 1;
      return vertical / horizontal;
    },
    [pointDistance],
  );

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return "";

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.88);
  };

  const completeStep = useCallback(() => {
    frameCountRef.current = 0;
    blinkReadyRef.current = false;

    setActiveStepIndex((prev) => {
      const next = prev + 1;
      if (next >= STEP_ORDER.length) {
        const selfie = captureSelfie();
        completedRef.current = true;
        void cleanup().finally(() => {
          onOpenChange(false);
          onSuccess(selfie);
        });
        return prev;
      }
      return next;
    });
  }, [cleanup, onOpenChange, onSuccess]);

  const runDetectionLoop = useCallback(async () => {
    const detector = detectorRef.current;
    const video = videoRef.current;
    if (!detector || !video) return;

    const detect = async () => {
      try {
        if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
          rafRef.current = window.requestAnimationFrame(() => void detect());
          return;
        }

        const faces = await detector.estimateFaces(video, { flipHorizontal: true });
        if (!faces.length) {
          frameCountRef.current = 0;
          rafRef.current = window.requestAnimationFrame(() => void detect());
          return;
        }

        const keypoints = faces[0].keypoints as Array<{ x: number; y: number }>;
        const nose = keypoints[1];
        const leftEyeOuter = keypoints[33];
        const rightEyeOuter = keypoints[263];
        if (!nose || !leftEyeOuter || !rightEyeOuter) {
          frameCountRef.current = 0;
          rafRef.current = window.requestAnimationFrame(() => void detect());
          return;
        }

        const eyeWidth = Math.max(pointDistance(leftEyeOuter, rightEyeOuter), 1);
        const eyeMidX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
        const yawNorm = (nose.x - eyeMidX) / eyeWidth;

        const leftEar = getEyeAspectRatio(keypoints, 159, 145, 33, 133);
        const rightEar = getEyeAspectRatio(keypoints, 386, 374, 362, 263);
        const ear = (leftEar + rightEar) / 2;

        const step = STEP_ORDER[activeStepIndex];
        let stepPassed = false;

        if (step === "center") {
          stepPassed = Math.abs(yawNorm) < 0.09;
        } else if (step === "turn_left") {
          stepPassed = yawNorm < -0.18;
        } else if (step === "turn_right") {
          stepPassed = yawNorm > 0.18;
        } else if (step === "blink") {
          if (ear > 0.24) {
            blinkReadyRef.current = true;
          }
          stepPassed = blinkReadyRef.current && ear < 0.17;
        }

        if (stepPassed) {
          frameCountRef.current += 1;
        } else {
          frameCountRef.current = 0;
        }

        const requiredFrames = step === "blink" ? 2 : 6;
        if (frameCountRef.current >= requiredFrames) {
          completeStep();
        }
      } catch {
        // keep loop alive to avoid transient model/camera failures
      }

      rafRef.current = window.requestAnimationFrame(() => void detect());
    };

    rafRef.current = window.requestAnimationFrame(() => void detect());
  }, [activeStepIndex, completeStep, getEyeAspectRatio, pointDistance]);

  useEffect(() => {
    if (!open) {
      void cleanup();
      setErrorMessage(null);
      setLoading(false);
      setInitialized(false);
      setActiveStepIndex(0);
      return;
    }

    completedRef.current = false;
    frameCountRef.current = 0;
    blinkReadyRef.current = false;
    setActiveStepIndex(0);
    setErrorMessage(null);
    setLoading(true);

    const init = async () => {
      try {
        await tf.setBackend("webgl");
      } catch {
        // backend may already be initialized in another part of the app
      }
      await tf.ready();

      if (!detectorRef.current) {
        detectorRef.current = await faceLandmarksDetection.createDetector(
          faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
          {
            runtime: "mediapipe",
            solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh",
            refineLandmarks: true,
            maxFaces: 1,
          },
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("Kamera baslatilamadi.");
      video.srcObject = stream;
      await video.play();

      timeoutRef.current = window.setTimeout(() => {
        if (!completedRef.current) {
          setErrorMessage("Canlılık süresi doldu. Lütfen tekrar deneyin.");
          onFailure?.("Canlılık süresi doldu.");
          onOpenChange(false);
        }
      }, 35000);

      setInitialized(true);
      setLoading(false);
      await runDetectionLoop();
    };

    void init().catch((error: unknown) => {
      setLoading(false);
      setInitialized(false);
      const message = error instanceof Error ? error.message : "Canlılık kontrolü başlatılamadı.";
      setErrorMessage(message);
      onFailure?.(message);
    });

    return () => {
      void cleanup();
    };
  }, [cleanup, onFailure, onOpenChange, open, runDetectionLoop]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Aktif Canlilik Kontrolu
          </DialogTitle>
          <DialogDescription>
            NFC sonrası güvenlik için canlı olduğunuzu doğruluyoruz. Ekrandaki adımları tamamlayın.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-lg border bg-black">
            <video ref={videoRef} className="h-64 w-full object-cover" muted playsInline autoPlay />
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            ) : null}
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>
                Adim {Math.min(activeStepIndex + 1, STEP_ORDER.length)}/{STEP_ORDER.length}: {STEP_LABELS[activeStep]}
              </span>
            </div>
          </div>

          {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          {!initialized && !loading && !errorMessage ? <p className="text-sm text-muted-foreground">Kamera hazırlanıyor...</p> : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
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
