import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import type { TFunction } from "i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Car, User, KeyRound } from "lucide-react";
import { z } from "zod";
import { getAuthRedirectUrl, getAuthErrorMessage } from "@/lib/authRedirect";
import { isDuplicateSignupUser, sendVerificationEmail } from "@/lib/verificationEmail";

const createSignInSchema = (t: TFunction) =>
  z.object({
    email: z.string().email({ message: t("auth.validation.emailInvalid") }),
    password: z.string().min(6, { message: t("auth.validation.passwordMin") }),
  });

const createSignUpSchema = (t: TFunction) =>
  z
    .object({
      email: z.string().email({ message: t("auth.validation.emailInvalid") }),
      password: z.string().min(6, { message: t("auth.validation.passwordMin") }),
      confirmPassword: z.string().min(6, { message: t("auth.validation.confirmPasswordMin") }),
      fullName: z.string().min(2, { message: t("auth.validation.fullNameMin") }),
      phone: z.string().min(10, { message: t("auth.validation.phoneInvalid") }).optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth.validation.passwordMismatch"),
      path: ["confirmPassword"],
    });

type UserType = "renter" | "car_owner";

const RESEND_COOLDOWN_SEC = 60;

const Auth = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [userType, setUserType] = useState<UserType>("renter");
  const [loading, setLoading] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [activeTab, setActiveTab] = useState("signin");
  const [emailVerifiedBanner, setEmailVerifiedBanner] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get("verified") !== "1") return;

    setEmailVerifiedBanner(true);
    setActiveTab("signin");
    toast.success(t("auth.toast.emailConfirmed"));

    const next = new URLSearchParams(searchParams);
    next.delete("verified");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, t]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (email.trim() && !resendEmail.trim()) {
      setResendEmail(email.trim());
    }
  }, [email, resendEmail]);

  const startResendCooldown = useCallback(() => {
    setResendCooldown(RESEND_COOLDOWN_SEC);
  }, []);

  const notifyVerificationSent = useCallback(
    (method: "edge" | "resend" | "magic_link", uncertain?: boolean) => {
      if (uncertain) {
        toast.warning(t("auth.toast.verificationUncertain"));
      } else if (method === "magic_link") {
        toast.success(t("auth.toast.magicLinkSent"));
      } else {
        toast.success(t("auth.toast.resendVerificationSuccess"));
      }
      startResendCooldown();
    },
    [startResendCooldown, t],
  );

  const trySendVerification = useCallback(
    async (targetEmail: string, options?: { silent?: boolean }) => {
      const result = await sendVerificationEmail(targetEmail);
      if (result.ok) {
        if (!options?.silent || result.uncertain) {
          notifyVerificationSent(result.method, result.uncertain);
        } else {
          startResendCooldown();
        }
        return true;
      }

      if (result.code === "already_confirmed") {
        toast.error(t("auth.toast.emailAlreadyConfirmed"));
      } else if (result.code === "not_found") {
        toast.error(t("auth.toast.verificationUserNotFound"));
      } else if (result.code === "edge_not_deployed") {
        toast.error(t("auth.toast.verificationServiceUnavailable"));
      } else {
        toast.error(result.message || t("auth.toast.verificationSendFailed"));
      }
      return false;
    },
    [notifyVerificationSent, startResendCooldown, t],
  );

  const signInSchema = useMemo(() => createSignInSchema(t), [t]);
  const signUpSchema = useMemo(() => createSignUpSchema(t), [t]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      signUpSchema.parse({
        email,
        password,
        confirmPassword,
        fullName,
        phone: phone ? phone.replace(/\D/g, "") : undefined,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    if (!termsAccepted) {
      toast.error(t("auth.toast.termsRequired"));
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = getAuthRedirectUrl("/");

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone,
            user_type: userType,
          },
        },
      });

      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes("already registered")) {
          setResendEmail(email.trim());
          await trySendVerification(email.trim());
        } else {
          toast.error(getAuthErrorMessage(error, t));
        }
        return;
      }

      if (data.user && data.session) {
        const successMessage =
          userType === "car_owner"
            ? t("auth.toast.signUpSuccessCarOwner")
            : t("auth.toast.signUpSuccessRenter");

        toast.success(successMessage);
        navigate("/");
      } else {
        setResendEmail(email.trim());
        if (isDuplicateSignupUser(data.user)) {
          await trySendVerification(email.trim());
        } else {
          const sent = await trySendVerification(email.trim(), { silent: true });
          toast.success(sent ? t("auth.toast.signUpVerifyEmail") : t("auth.toast.signUpVerifyEmailCheckResend"));
        }
      }
    } catch (error) {
      console.error("Kayıt hatası:", error);
      toast.error(t("auth.toast.genericError"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      signInSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error(t("auth.toast.invalidCredentials"));
        } else if (error.message.toLowerCase().includes("email not confirmed")) {
          setResendEmail(email.trim());
          toast.error(t("auth.toast.emailNotConfirmed"));
        } else {
          toast.error(getAuthErrorMessage(error, t));
        }
        return;
      }

      if (data.user) {
        toast.success(t("auth.toast.signInSuccess"));
        navigate("/");
      }
    } catch (error) {
      console.error("Giriş hatası:", error);
      toast.error(t("auth.toast.genericError"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = resendEmail.trim();
    if (!targetEmail) {
      toast.error(t("auth.toast.resendEmailRequired"));
      return;
    }

    if (resendCooldown > 0) {
      toast.message(t("auth.resendVerification.waitSeconds", { seconds: resendCooldown }));
      return;
    }

    setResendingVerification(true);
    try {
      await trySendVerification(targetEmail);
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <Car className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">RideYo</span>
        </Link>

        <Card className="p-8">
          {emailVerifiedBanner && (
            <Alert className="mb-6 border-emerald-500/40 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <AlertDescription className="text-sm font-medium">
                {t("auth.emailVerifiedBanner")}
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">{t("auth.tabs.signIn")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.tabs.signUp")}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">{t("auth.fields.email")}</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder={t("auth.placeholders.email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">{t("auth.fields.password")}</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder={t("auth.placeholders.password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("auth.signIn.submitting") : t("auth.signIn.submit")}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-3">
                  <Label>{t("auth.fields.accountType")}</Label>
                  <RadioGroup
                    value={userType}
                    onValueChange={(value) => setUserType(value as UserType)}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem value="renter" id="renter" className="peer sr-only" />
                      <Label
                        htmlFor="renter"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <User className="mb-2 h-6 w-6" />
                        <span className="text-sm font-medium">{t("auth.signUp.renter")}</span>
                        <span className="text-xs text-muted-foreground text-center mt-1">{t("auth.signUp.renterDesc")}</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="car_owner" id="car_owner" className="peer sr-only" />
                      <Label
                        htmlFor="car_owner"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <KeyRound className="mb-2 h-6 w-6" />
                        <span className="text-sm font-medium">{t("auth.signUp.carOwner")}</span>
                        <span className="text-xs text-muted-foreground text-center mt-1">{t("auth.signUp.carOwnerDesc")}</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t("auth.fields.fullName")}</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder={t("auth.placeholders.fullName")}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">{t("auth.fields.phone")}</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder={t("auth.placeholders.phone")}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t("auth.fields.email")}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder={t("auth.placeholders.email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t("auth.fields.password")}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder={t("auth.placeholders.password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">{t("auth.fields.confirmPassword")}</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder={t("auth.placeholders.password")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox id="signup-terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(Boolean(checked))} />
                  <label htmlFor="signup-terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    <Trans
                      i18nKey="auth.signUp.termsAccept"
                      components={{
                        rentalLink: <Link to="/rental-agreement" className="text-primary hover:underline" />,
                        privacyLink: <Link to="/privacy" className="text-primary hover:underline" />,
                      }}
                    />
                  </label>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t("auth.signUp.submitting") : t("auth.signUp.submit")}
                </Button>

                {userType === "car_owner" && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {t("auth.signUp.carOwnerHint")}
                  </p>
                )}
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 border-t pt-6 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">{t("auth.resendVerification.title")}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t("auth.resendVerification.hint")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resend-email">{t("auth.fields.email")}</Label>
              <Input
                id="resend-email"
                type="email"
                placeholder={t("auth.placeholders.email")}
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={resendingVerification || resendCooldown > 0 || !resendEmail.trim()}
              onClick={handleResendVerification}
            >
              {resendingVerification
                ? t("auth.resendVerification.submitting")
                : resendCooldown > 0
                  ? t("auth.resendVerification.waitSeconds", { seconds: resendCooldown })
                  : t("auth.resendVerification.submit")}
            </Button>
            <p className="text-xs text-muted-foreground leading-relaxed rounded-md border bg-muted/40 p-3">
              {t("auth.resendVerification.troubleshoot")}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
