import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation, Trans } from "react-i18next";
import type { TFunction } from "i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Car, User, KeyRound } from "lucide-react";
import { z } from "zod";

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
  const navigate = useNavigate();

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
      const redirectUrl = `${window.location.origin}/`;

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
        if (error.message.toLowerCase().includes("already registered")) {
          toast.error(t("auth.toast.emailAlreadyRegistered"));
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user && data.session) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: fullName,
          phone: phone || null,
        });
        if (profileError) {
          console.error("Profil olusturma hatasi:", profileError);
        }

        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: userType === "car_owner" ? "car_owner" : "user",
        });
        if (roleError) {
          console.error("Rol ekleme hatasi:", roleError);
        }

        const successMessage =
          userType === "car_owner"
            ? t("auth.toast.signUpSuccessCarOwner")
            : t("auth.toast.signUpSuccessRenter");

        toast.success(successMessage);
        navigate("/");
      } else {
        toast.success(t("auth.toast.signUpVerifyEmail"));
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
          toast.error(t("auth.toast.emailNotConfirmed"));
        } else {
          toast.error(error.message);
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
          <Tabs defaultValue="signin" className="w-full">
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
        </Card>
      </div>
    </div>
  );
};

export default Auth;
