import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
}

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    // Check if notifications are supported
    setIsSupported('Notification' in window);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      toast({
        title: "Desteklenmiyor",
        description: "Tarayıcınız bildirim desteği sunmuyor",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast({
          title: "Bildirimler Açık",
          description: "Artık önemli güncellemeler alacaksınız",
        });
        return true;
      } else {
        toast({
          title: "Bildirimler Kapalı",
          description: "Ayarlardan bildirimleri açabilirsiniz",
        });
        return false;
      }
    } catch (error) {
      console.error('Notification permission error:', error);
      return false;
    }
  };

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission === 'granted') {
      try {
        const notification = new Notification(title, {
          icon: '/icon-512x512.png',
          badge: '/icon-512x512.png',
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        return notification;
      } catch (error) {
        console.error('Notification error:', error);
        return null;
      }
    }
    return null;
  }, [permission]);

  const sendRentalNotification = useCallback(
    (type: "start" | "end" | "alert" | "location", carName: string, message?: string) => {
      const notifications: Record<string, { title: string; body: string }> = {
        start: {
          title: "Kiralama Başladı 🚗",
          body: `${carName} aracınızın kiralaması başladı.`,
        },
        end: {
          title: "Kiralama Sona Erdi ✅",
          body: `${carName} aracınızın kiralaması sona erdi.`,
        },
        alert: {
          title: "Araç Uyarısı ⚠️",
          body: message || `${carName} aracınız için bir uyarı var.`,
        },
        location: {
          title: "Konum Güncellemesi 📍",
          body: message || `${carName} aracınızın konumu güncellendi.`,
        },
      };

      const notification = notifications[type];
      if (notification) {
        return sendNotification(notification.title, {
          body: notification.body,
          tag: `rental-${type}`,
          requireInteraction: type === "alert",
        });
      }
      return null;
    },
    [sendNotification]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
    sendRentalNotification,
  };
};
