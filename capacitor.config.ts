import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'top.nextclass.app',
  appName: 'NextClass',
  webDir: 'dist',
  server: {
    // TODO: 替换为你真实的 Vercel 部署域名
    url: 'https://YOUR_VERCEL_APP_URL.vercel.app',
    cleartext: true,
  },
};

export default config;
