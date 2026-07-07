import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthErrorMessage } from "@/lib/authRedirect";
import { isNativeMobile } from "@/lib/platform";
import {
  formatPhoneForDisplay,
  normalizeTurkishPhone,
  sendPhoneLoginOtp,
  verifyPhoneLoginOtp,
} from "@/lib/phoneAuth";

const OTP_COOLDOWN_SEC = 60;

const PhoneAuthSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  if (!isNativeMobile()) {
    return null;
  }

  const handleSendCode = async () => {
    const normalized = normalizeTurkishPhone(phoneInput);
    if (!normalized) {
      toast.error(t("auth.phoneSignIn.invalidPhone"));
      return;
    }

    if (cooldown > 0) {
      toast.message(t("auth.phoneSignIn.waitSeconds", { seconds: cooldown }));
      return;
    }

    setLoading(true);
    try {
      const result = await sendPhoneLoginOtp(normalized);
      setPhoneE164(normalized);
      setStep("otp");
      setOtp("");
      setCooldown(OTP_COOLDOWN_SEC);
      if (result.demo && result.debug_code) {
        toast.message(t("auth.phoneSignIn.demoCode", { code: result.debug_code }));
      }
      toast.success(t("auth.phoneSignIn.codeSent"));
    } catch (error) {
      const message =
        error instanceof Error
          ? getAuthErrorMessage(error, t)
          : t("auth.toast.genericError");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!phoneE164) return;

    const code = otp.replace(/\D/g, "");
    if (code.length < 6) {
      toast.error(t("auth.phoneSignIn.invalidOtp"));
      return;
    }

    setLoading(true);
    try {
      const { session } = await verifyPhoneLoginOtp(phoneE164, code);
      if (!session) {
        throw new Error(t("auth.phoneSignIn.verifyFailed"));
      }
      toast.success(t("auth.phoneSignIn.success"));
      navigate("/");
    } catch (error) {
      const message =
        error instanceof Error
          ? getAuthErrorMessage(error, t)
          : t("auth.phoneSignIn.verifyFailed");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phoneE164 || cooldown > 0) return;
    setLoading(true);
    try {
      await sendPhoneLoginOtp(phoneE164);
      setCooldown(OTP_COOLDOWN_SEC);
      toast.success(t("auth.phoneSignIn.codeSent"));
    } catch (error) {
      const message =
        error instanceof Error
          ? getAuthErrorMessage(error, t)
          : t("auth.toast.genericError");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">{t("auth.phoneSignIn.title")}</p>
      </div>
      <p className="text-xs text-muted-foreground">{t("auth.phoneSignIn.subtitle")}</p>

      {step === "phone" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="phone-login">{t("auth.fields.phone")}</Label>
            <Input
              id="phone-login"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t("auth.placeholders.phone")}
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
            />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={loading}
            onClick={() => void handleSendCode()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("auth.phoneSignIn.sendingCode")}
              </>
            ) : (
              t("auth.phoneSignIn.sendCode")
            )}
          </Button>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {t("auth.phoneSignIn.sentTo", {
              phone: phoneE164 ? formatPhoneForDisplay(phoneE164) : phoneInput,
            })}
          </p>
          <div className="space-y-2">
            <Label htmlFor="phone-otp">{t("auth.phoneSignIn.otpLabel")}</Label>
            <Input
              id="phone-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder={t("auth.phoneSignIn.otpPlaceholder")}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={loading || otp.length < 6}
            onClick={() => void handleVerify()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("auth.phoneSignIn.verifying")}
              </>
            ) : (
              t("auth.phoneSignIn.verify")
            )}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-1"
              disabled={loading}
              onClick={() => {
                setStep("phone");
                setOtp("");
              }}
            >
              {t("auth.phoneSignIn.changeNumber")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex-1"
              disabled={loading || cooldown > 0}
              onClick={() => void handleResend()}
            >
              {cooldown > 0
                ? t("auth.phoneSignIn.waitSeconds", { seconds: cooldown })
                : t("auth.phoneSignIn.resend")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default PhoneAuthSection;
