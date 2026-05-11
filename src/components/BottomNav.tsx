import { Home, Car, Plus, User, Search, Heart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const baseItemClass =
    "flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 transition-all";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-safe md:hidden">
      <div className={`grid h-16 ${user ? "grid-cols-6" : "grid-cols-3"} items-center px-1`}>
        <Link
          to="/"
          className={`${baseItemClass} ${
            isActive("/") ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] leading-none font-medium truncate max-w-full">Ana Sayfa</span>
        </Link>

        <Link
          to="/cars"
          className={`${baseItemClass} ${
            isActive("/cars") ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] leading-none font-medium truncate max-w-full">Araçlar</span>
        </Link>

        {user && (
          <Link
            to="/favorites"
            className={`${baseItemClass} ${
              isActive("/favorites") ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart className="w-5 h-5" />
            <span className="text-[10px] leading-none font-medium truncate max-w-full">Favoriler</span>
          </Link>
        )}

        {user && (
          <Link
            to="/add-car"
            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-primary-foreground bg-primary shadow-lg"
          >
            <div className="w-8 h-8 rounded-full bg-primary-foreground/15 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[10px] leading-none font-medium truncate max-w-full">Ekle</span>
          </Link>
        )}

        {user && (
          <Link
            to="/my-cars"
            className={`${baseItemClass} ${
              isActive("/my-cars") ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Car className="w-5 h-5" />
            <span className="text-[10px] leading-none font-medium truncate max-w-full">Araçlarım</span>
          </Link>
        )}

        <Link
          to={user ? "/profile" : "/auth"}
          className={`${baseItemClass} ${
            isActive(user ? "/profile" : "/auth")
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] leading-none font-medium truncate max-w-full">{user ? "Profil" : "Giriş"}</span>
        </Link>
      </div>
    </nav>
  );
};

export default BottomNav;
