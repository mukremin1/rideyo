import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Car, CheckCircle, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface VehicleAlert {
  id: string;
  car_id: string;
  alert_type: string;
  severity: string;
  description: string;
  is_resolved: boolean;
  created_at: string;
  cars: {
    name: string;
    plate_number: string;
  };
}
interface VehicleAlertRow extends Omit<VehicleAlert, "cars"> {
  cars: VehicleAlert["cars"] | VehicleAlert["cars"][] | null;
}

const VehicleAlerts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<VehicleAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchAlerts();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('vehicle-alerts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vehicle_alerts'
      }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicle_alerts")
        .select(`
          *,
          cars (
            name,
            plate_number
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const normalized: VehicleAlert[] = ((data ?? []) as VehicleAlertRow[]).map((row) => ({
        ...row,
        cars: Array.isArray(row.cars) ? row.cars[0] : row.cars ?? { name: "-", plate_number: "-" },
      }));
      setAlerts(normalized);
    } catch (error) {
      console.error("Uyarılar yüklenemedi:", error);
      toast.error("Uyarılar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    const { error } = await supabase
      .from("vehicle_alerts")
      .update({ 
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id
      })
      .eq("id", alertId);

    if (!error) {
      toast.success("Uyarı çözüldü olarak işaretlendi");
      fetchAlerts();
    }
  };

  const getAlertIcon = (type: string) => {
    const icons: Record<string, LucideIcon> = {
      hood_open: AlertTriangle,
      accident: XCircle,
      speeding: AlertTriangle,
      unauthorized_access: XCircle,
    };
    const Icon = icons[type] || AlertTriangle;
    return <Icon className="w-5 h-5" />;
  };

  const getAlertLabel = (type: string) => {
    const labels: Record<string, string> = {
      hood_open: "Kaput Açıldı",
      accident: "Kaza",
      speeding: "Hız Sınırı Aşıldı",
      unauthorized_access: "Yetkisiz Erişim",
    };
    return labels[type] || type;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: "bg-blue-500",
      medium: "bg-yellow-500",
      high: "bg-orange-500",
      critical: "bg-red-500",
    };
    return colors[severity] || "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar />

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">Araç Uyarıları</h1>
            <p className="text-muted-foreground">
              Araçlarınızdan gelen güvenlik ve durum bildirimleri
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">Yükleniyor...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <p className="text-xl text-muted-foreground">Tüm araçlar güvende</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={`p-6 ${
                    !alert.is_resolved ? "border-l-4 " + getSeverityColor(alert.severity) : ""
                  }`}
                >
                  <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-full ${getSeverityColor(alert.severity)} bg-opacity-20 flex items-center justify-center flex-shrink-0`}>
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-lg">{getAlertLabel(alert.alert_type)}</h3>
                          <p className="text-sm text-muted-foreground">
                            {alert.cars.name} - {alert.cars.plate_number}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge
                            variant={alert.severity === "critical" ? "destructive" : "outline"}
                          >
                            {alert.severity.toUpperCase()}
                          </Badge>
                          {alert.is_resolved && (
                            <Badge variant="secondary">Çözüldü</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-3">{alert.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(alert.created_at), "d MMMM yyyy, HH:mm", {
                            locale: tr,
                          })}
                        </span>
                        {!alert.is_resolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Çözüldü İşaretle
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

export default VehicleAlerts;
