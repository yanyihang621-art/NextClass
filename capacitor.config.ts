import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'top.nextclass.app',
  appName: 'NextClass',
  webDir: 'dist',
  server: {
    // TODO: 替换为你真实的 Vercel 部署域名
    url: 'https://nextclass.top',
    cleartext: true,
  },
};

export default config;
