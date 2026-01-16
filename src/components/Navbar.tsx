import { Link, useNavigate } from "react-router-dom";
import { Car, User, LogOut, Plus, Heart, Bell, Shield, MessageCircle, AlertTriangle, Award, Calendar } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUnreadNotifications();
      checkAdminRole();
      
      const channel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchUnreadNotifications();
        })
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border pt-safe">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">
          <Link to="/" className="flex items-center gap-2 transition-transform active:scale-95 md:hover:scale-105">
            <img
              src="/logo-512x512.png"
              alt="RideYo logo"
              className="w-9 h-9 md:w-10 md:h-10 rounded-md object-contain"
              loading="eager"
            />
            <span className="text-lg md:text-xl font-bold text-foreground">RideYo</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
              Ana Sayfa
            </Link>
            <Link to="/about" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
              Hakkımızda
            </Link>
            <Link to="/cars" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
              Araçlar
            </Link>
            <a href="/#how-it-works" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
              Nasıl Çalışır
            </a>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {user ? (
              <>
                <Link to="/favorites" className="hidden md:block">
                  <Button variant="ghost" size="icon">
                    <Heart className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/notifications" className="hidden md:block">
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
                <Link to="/my-cars" className="hidden md:inline-flex">
                  <Button variant="ghost">
                    Araçlarım
                  </Button>
                </Link>
                <Link to="/add-car" className="hidden md:inline-flex">
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Araç Ekle
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="icon" className="h-9 w-9 md:h-10 md:w-10">
                      <User className="w-4 h-4 md:w-5 md:h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-popover">
                    <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/favorites")}>
                      <Heart className="w-4 h-4 mr-2" />
                      Favorilerim
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/notifications")}>
                      <Bell className="w-4 h-4 mr-2" />
                      Bildirimler
                      {unreadCount > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          {unreadCount}
                        </Badge>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/my-bookings")}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Rezervasyonlarım
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/my-cars")}>
                      <Car className="w-4 h-4 mr-2" />
                      Araçlarım
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/add-car")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Araç Ekle
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/subscription")}>
                      <Car className="w-4 h-4 mr-2" />
                      Abonelik
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/driver-score")}>
                      <Award className="w-4 h-4 mr-2" />
                      Sürücü Puanım
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/vehicle-alerts")}>
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Araç Uyarıları
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/support")}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Destek
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin")}>
                          <Shield className="w-4 h-4 mr-2" />
                          Admin Panel
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Çıkış Yap
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/auth" className="hidden md:inline-flex">
                  <Button variant="ghost">
                    Giriş Yap
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="default" size="sm" className="h-9 md:h-10">
                    Üye Ol
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
