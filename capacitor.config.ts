import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rideyo',
  appName: 'RideYo',
  webDir: 'dist',
  server: {
    url: 'https://0db773dd-9530-4362-a44e-3059b271f6c6.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#8B5CF6',
      showSpinner: false,
    },
  },
};

export default config;
