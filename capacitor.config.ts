import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'top.nextclass.app',
  appName: 'NextClass',
  webDir: 'dist'
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false, // 设为 false，因为我们已经在 React 代码里写了更灵活的更新逻辑
    }
  }
};

export default config;
