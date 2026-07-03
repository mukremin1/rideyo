import { Capacitor } from "@capacitor/core";

export const isNativeMobile = (): boolean =>
  Capacitor.isNativePlatform() && ["android", "ios"].includes(Capacitor.getPlatform());
