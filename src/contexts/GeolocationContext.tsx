import { createContext, useContext, type ReactNode } from "react";
import { useGeolocationState, type GeolocationHookValue } from "@/hooks/useGeolocation";

const GeolocationContext = createContext<GeolocationHookValue | null>(null);

export const GeolocationProvider = ({ children }: { children: ReactNode }) => {
  const value = useGeolocationState();
  return <GeolocationContext.Provider value={value}>{children}</GeolocationContext.Provider>;
};

export const useGeolocation = (): GeolocationHookValue => {
  const ctx = useContext(GeolocationContext);
  if (!ctx) {
    throw new Error("useGeolocation must be used within GeolocationProvider");
  }
  return ctx;
};
