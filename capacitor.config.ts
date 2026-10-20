import type { CapacitorConfig } from '@capacitor/cli';

// Harness app packaging. Build the web bundle first:
//   npx ng build harness -c production,sqlite   (or production,classic)
//   npx cap sync android
const config: CapacitorConfig = {
  appId: 'dev.ngrxsqlite.harness',
  appName: 'NgRx SQLite Harness',
  webDir: 'dist/harness/browser',
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
      androidBiometric: { biometricAuth: false },
    },
  },
};

export default config;
