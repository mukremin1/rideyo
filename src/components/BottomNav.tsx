import { Home, Car, Calendar, Heart, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();

  const isActive = (path: string) => location.pathname === path;

  const guestItems = [
    { to: "/", label: t("nav.home"), icon: Home },
    { to: "/cars", label: t("nav.cars"), icon: Car },
    { to: "/auth", label: t("nav.signIn"), icon: User },
  ];

  const userItems = [
    { to: "/", label: t("nav.home"), icon: Home },
    { to: "/cars", label: t("nav.cars"), icon: Car },
    { to: "/my-bookings", label: t("nav.bookings"), icon: Calendar },
    { to: "/favorites", label: t("nav.favorites"), icon: Heart },
    { to: "/profile", label: t("nav.account"), icon: User },
  ];

  const items = user ? userItems : guestItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-background/95 backdrop-blur-lg pb-safe md:hidden">
      <div className={cn("grid h-[4.25rem] items-stretch px-1", user ? "grid-cols-5" : "grid-cols-3")}>
        {items.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                  active && "bg-primary/10",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 2} />
              </span>
              <span className="max-w-full truncate text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
