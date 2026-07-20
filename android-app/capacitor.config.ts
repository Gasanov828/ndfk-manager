import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ndfk.manager",
  appName: "НДФК Manager",
  webDir: "www",
  server: {
    url: "https://ndfk-manager.vercel.app",
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
