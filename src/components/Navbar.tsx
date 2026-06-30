import { Link, useNavigate } from "react-router-dom";
import {
  User,
  LogOut,
  Plus,
  Heart,
  Bell,
  Shield,
  ShieldCheck,
  MessageCircle,
  AlertTriangle,
  Award,
  Calendar,
  Car,
  Menu,
  LayoutDashboard,
  CreditCard,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import BrandLogo from "./BrandLogo";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

const Navbar = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: "/", label: t("nav.home") },
    { to: "/cars", label: t("nav.fleet") },
    { to: "/#how-it-works", label: t("nav.howItWorks"), hash: true },
    { to: "/owner-dashboard", label: t("nav.owners") },
    { to: "/support", label: t("nav.support") },
  ];

  const isIdentityVerified = Boolean(
    (user?.user_metadata?.nfc_verified_at || user?.user_metadata?.nfc_verified) &&
      (user?.user_metadata?.liveness_verified_at || user?.user_metadata?.liveness_verified),
  );

  useEffect(() => {
    if (user) {
      fetchUnreadNotifications();
      checkAdminRole();

      const channel = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchUnreadNotifications();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchUnreadNotifications = async () => {
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user?.id)
      .eq("is_read", false);

    setUnreadCount(count || 0);
  };

  const checkAdminRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user?.id)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!data);
  };

  const go = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur-lg pt-safe">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[3.75rem] items-center justify-between gap-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <BrandLogo size="md" className="hidden sm:block" />
            <BrandLogo size="sm" className="sm:hidden" />

            <div className="hidden xl:flex items-center gap-1 ml-6">
              {navLinks.map((link) =>
                link.hash ? (
                  <a
                    key={link.to}
                    href={link.to}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
            <LanguageSwitcher />
            {user ? (
              <>
                <Link to="/my-bookings" className="hidden lg:inline-flex">
                  <Button variant="ghost" size="sm" className="font-medium">
                    <Calendar className="mr-2 h-4 w-4" />
                    {t("nav.myBookings")}
                  </Button>
                </Link>
                <Link to="/favorites" className="hidden md:inline-flex">
                  <Button variant="ghost" size="icon" aria-label={t("nav.favorites")}>
                    <Heart className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/notifications" className="hidden md:inline-flex">
                  <Button variant="ghost" size="icon" className="relative" aria-label={t("nav.notifications")}>
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center p-0 text-[10px]">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </Link>

                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="xl:hidden" aria-label={t("nav.menu")}>
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[min(100vw-2rem,22rem)]">
                    <SheetHeader>
                      <SheetTitle className="text-left">
              <BrandLogo size="md" linkTo={undefined} />
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-6">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("nav.explore")}
                        </p>
                        <div className="space-y-1">
                          {navLinks.map((link) =>
                            link.hash ? (
                              <a
                                key={link.to}
                                href={link.to}
                                onClick={() => setMobileOpen(false)}
                                className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
                              >
                                {link.label}
                              </a>
                            ) : (
                              <button
                                key={link.to}
                                type="button"
                                onClick={() => go(link.to)}
                                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-muted"
                              >
                                {link.label}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {t("nav.rental")}
                        </p>
                        <div className="space-y-1">
                          <button type="button" onClick={() => go("/my-bookings")} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-muted">
                            {t("nav.myBookings")}
                          </button>
                          <button type="button" onClick={() => go("/favorites")} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-muted">
                            {t("nav.favorites")}
                          </button>
                          <button type="button" onClick={() => go("/packages")} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-muted">
                            {t("nav.subscriptionPlans")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="sm" className="h-9 gap-2 px-3 font-medium">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">{t("nav.account")}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 bg-popover">
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-sm font-semibold">{t("nav.account")}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">{t("profile.title")}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigate("/profile")}>
                        <User className="mr-2 h-4 w-4" />
                        {t("nav.profileInfo")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/identity-verification")}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        {isIdentityVerified ? t("nav.identityVerified") : t("nav.identityVerify")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/driver-score")}>
                        <Award className="mr-2 h-4 w-4" />
                        {t("nav.driverScore")}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />

                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">{t("nav.rental")}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigate("/my-bookings")}>
                        <Calendar className="mr-2 h-4 w-4" />
                        {t("nav.myBookings")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/favorites")}>
                        <Heart className="mr-2 h-4 w-4" />
                        {t("nav.favorites")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/packages")}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        {t("nav.subscriptionPlans")}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />

                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">{t("nav.owner")}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigate("/owner-dashboard")}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {t("nav.ownerPanel")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/my-cars")}>
                        <Car className="mr-2 h-4 w-4" />
                        {t("nav.myCars")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/add-car")}>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("nav.addCar")}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />

                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">{t("nav.support")}</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigate("/notifications")}>
                        <Bell className="mr-2 h-4 w-4" />
                        {t("nav.notifications")}
                        {unreadCount > 0 && (
                          <Badge variant="secondary" className="ml-auto">
                            {unreadCount}
                          </Badge>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/vehicle-alerts")}>
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        {t("nav.vehicleAlerts")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/support")}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {t("nav.supportCenter")}
                      </DropdownMenuItem>
                    </DropdownMenuGroup>

                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin")}>
                          <Shield className="mr-2 h-4 w-4" />
                          {t("nav.adminPanel")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/add-car")}>
                          <Plus className="mr-2 h-4 w-4" />
                          {t("nav.addCar")}
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      {t("nav.signOut")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="xl:hidden" aria-label={t("nav.menu")}>
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[min(100vw-2rem,22rem)]">
                    <SheetHeader>
                      <SheetTitle className="text-left">
              <BrandLogo size="md" linkTo={undefined} />
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-1">
                      {navLinks.map((link) =>
                        link.hash ? (
                          <a
                            key={link.to}
                            href={link.to}
                            onClick={() => setMobileOpen(false)}
                            className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <button
                            key={link.to}
                            type="button"
                            onClick={() => go(link.to)}
                            className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-muted"
                          >
                            {link.label}
                          </button>
                        ),
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
                <Link to="/auth" className="hidden md:inline-flex">
                  <Button variant="ghost" size="sm" className="font-medium">
                    {t("nav.signIn")}
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="default" size="sm" className="h-9 font-medium">
                    {t("nav.signUp")}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
