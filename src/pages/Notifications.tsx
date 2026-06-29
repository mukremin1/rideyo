import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDateLocale } from "@/hooks/useDateLocale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const Notifications = () => {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Notifications load error:", error);
      toast.error(t("support.notifications.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user?.id)
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success(t("support.notifications.allMarkedRead"));
    }
  };

  const getTypeLabel = (type: string) =>
    t(`support.notifications.types.${type}`, { defaultValue: type });

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      booking: "bg-blue-500",
      campaign: "bg-amber-500",
      system: "bg-gray-500",
      review: "bg-green-500",
    };
    return colors[type] || "bg-gray-500";
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">{t("support.notifications.title")}</h1>
              <p className="text-muted-foreground">
                {t("support.notifications.unreadCount", { count: unreadCount })}
              </p>
            </div>
            {notifications.some((n) => !n.is_read) && (
              <Button onClick={markAllAsRead} variant="outline">
                <Check className="w-4 h-4 mr-2" />
                {t("support.notifications.markAllRead")}
              </Button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">{t("common.loading")}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-xl text-muted-foreground">{t("support.notifications.empty")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-4 ${!notification.is_read ? "border-primary/50 bg-primary/5" : ""}`}
                >
                  <div className="flex gap-4">
                    <div className={`w-10 h-10 rounded-full ${getTypeColor(notification.type)} flex items-center justify-center flex-shrink-0`}>
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{notification.title}</h3>
                        <Badge variant="outline" className="flex-shrink-0">
                          {getTypeLabel(notification.type)}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-2">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(notification.created_at), "d MMMM yyyy, HH:mm", { locale: dateLocale })}
                        </span>
                        {!notification.is_read && (
                          <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                            <Check className="w-4 h-4 mr-1" />
                            {t("support.notifications.markRead")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Notifications;
