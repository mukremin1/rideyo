import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Car, User, KeyRound } from "lucide-react";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email({ message: "Geçerli bir e-posta adresi girin" }),
  password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır" }),
  fullName: z.string().min(2, { message: "Ad soyad en az 2 karakter olmalıdır" }).optional(),
  phone: z.string().min(10, { message: "Geçerli bir telefon numarası girin" }).optional(),
});

type UserType = "renter" | "car_owner";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [userType, setUserType] = useState<UserType>("renter");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      authSchema.parse({ email, password, fullName, phone: phone || undefined });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
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
            phone: phone,
            user_type: userType,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Bu e-posta adresi zaten kayıtlı");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: fullName,
          phone: phone || null,
        });

        if (profileError) {
          console.error("Profil oluşturma hatası:", profileError);
        }

        // Add user role
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: data.user.id,
          role: userType === "car_owner" ? "car_owner" : "user",
        });

        if (roleError) {
          console.error("Rol ekleme hatası:", roleError);
        }

        const successMessage = userType === "car_owner" 
          ? "Araç sahibi olarak kayıt başarılı! Artık araç ekleyebilirsiniz."
          : "Kayıt başarılı! Artık araç kiralayabilirsiniz.";
        
        toast.success(successMessage);
        navigate("/");
      }
    } catch (error) {
      console.error("Kayıt hatası:", error);
      toast.error("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      authSchema.parse({ email, password });
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
          toast.error("E-posta veya şifre hatalı");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        toast.success("Giriş başarılı!");
        navigate("/");
      }
    } catch (error) {
      console.error("Giriş hatası:", error);
      toast.error("Bir hata oluştu");
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
              <TabsTrigger value="signin">Giriş Yap</TabsTrigger>
              <TabsTrigger value="signup">Üye Ol</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">E-posta</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Şifre</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                {/* User Type Selection */}
                <div className="space-y-3">
                  <Label>Hesap Türü</Label>
                  <RadioGroup
                    value={userType}
                    onValueChange={(value) => setUserType(value as UserType)}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem
                        value="renter"
                        id="renter"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="renter"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <User className="mb-2 h-6 w-6" />
                        <span className="text-sm font-medium">Kiracı</span>
                        <span className="text-xs text-muted-foreground text-center mt-1">
                          Araç kiralamak istiyorum
                        </span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem
                        value="car_owner"
                        id="car_owner"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="car_owner"
                        className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <KeyRound className="mb-2 h-6 w-6" />
                        <span className="text-sm font-medium">Araç Sahibi</span>
                        <span className="text-xs text-muted-foreground text-center mt-1">
                          Aracımı kiraya vermek istiyorum
                        </span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-name">Ad Soyad</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Adınız Soyadınız"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Telefon</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="05XX XXX XX XX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-posta</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Şifre</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Kayıt olunuyor..." : "Üye Ol"}
                </Button>

                {userType === "car_owner" && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Araç sahibi olarak kaydolarak aracınızı platformumuza ekleyebilir ve gelir elde edebilirsiniz.
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