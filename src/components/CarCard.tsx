import { Car as CarType } from "@/types/car";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { MapPin, Users, Fuel, Settings, Clock, Heart, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CarCardProps {
  car: CarType;
  rentalType?: string;
}

interface Campaign {
  discount_percentage: number;
  name: string;
}

const CarCard = ({ car, rentalType }: CarCardProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isFavorite, setIsFavorite] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    if (user) {
      checkFavorite();
    }
    fetchActiveCampaign();
  }, [user, car.id]);

  const checkFavorite = async () => {
    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user?.id)
      .eq("car_id", car.id)
      .maybeSingle();

    setIsFavorite(!!data);
  };

  const fetchActiveCampaign = async () => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("campaigns")
      .select("discount_percentage, name")
      .eq("is_active", true)
      .lte("start_date", now)
      .gte("end_date", now)
      .or(`car_types.is.null,car_types.cs.{${car.type}}`)
      .order("discount_percentage", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setCampaign(data);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error(t("carCard.loginForFavorite"));
      return;
    }

    if (isFavorite) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("car_id", car.id);
      setIsFavorite(false);
      toast.success(t("carCard.removedFromFavorites"));
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, car_id: car.id });
      setIsFavorite(true);
      toast.success(t("carCard.addedToFavorites"));
    }
  };

  const discountedPrice = campaign
    ? car.pricePerMinute * (1 - campaign.discount_percentage / 100)
    : car.pricePerMinute;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={car.image} 
          alt={car.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={toggleFavorite}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
        </Button>
        {campaign && (
          <Badge className="absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)] truncate bg-amber-500 text-white gap-1 text-[10px] sm:text-xs">
            <Tag className="w-3 h-3 shrink-0" />
            %{campaign.discount_percentage} {campaign.name}
          </Badge>
        )}
        {car.available ? (
          <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
            {t("carCard.available")}
          </Badge>
        ) : (
          <Badge variant="destructive" className="absolute top-4 right-4">
            {t("carCard.inUse")}
          </Badge>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">{car.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{car.location}</span>
              {car.distance && <span className="ml-2">• {car.distance} km</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{t("carCard.seats", { count: car.seats })}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Fuel className="w-4 h-4" />
            <span>{car.fuelType}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Settings className="w-4 h-4" />
            <span>{car.transmission}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{car.pricePerHour}₺{t("carCard.perHour")}</span>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              {campaign ? (
                <>
                  <span className="text-2xl font-bold text-foreground">{discountedPrice.toFixed(2)}₺</span>
                  <span className="text-sm text-muted-foreground line-through ml-2">{car.pricePerMinute}₺</span>
                  <span className="text-sm text-muted-foreground ml-1">{t("carCard.perMinute")}</span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-bold text-foreground">{car.pricePerMinute}₺</span>
                  <span className="text-sm text-muted-foreground ml-1">{t("carCard.perMinute")}</span>
                </>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">{car.pricePerDay}{t("carCard.perDay")}</div>
            </div>
          </div>

          <Link
            to={rentalType ? `/car/${car.id}?rental=${rentalType}` : `/car/${car.id}`}
            className="w-full block"
          >
            <Button 
              className="w-full" 
              disabled={!car.available}
            >
              {car.available ? t("carCard.viewDetails") : t("carCard.notAvailable")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CarCard;
