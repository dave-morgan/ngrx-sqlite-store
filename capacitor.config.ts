import type { CapacitorConfig } from '@capacitor/cli';

// Harness app packaging. Build the web bundle first:
//   npx ng build harness -c production,sqlite   (or production,classic)
//   npx cap sync android
const config: CapacitorConfig = {
  appId: 'dev.ngrxsqlite.harness',
  appName: 'NgRx SQLite Harness',
  webDir: 'dist/harness/browser',
  // Capacitor's default 'debug' logging prints every bridge call with its full payload
  // (console.groupCollapsed + console.dir) in debug builds; with a devtools/CDP client
  // attached those messages and payloads are serialized and retained. That skews every
  // bridge-bound metric (and memory), so keep it off: benchmarks run debug APKs.
  loggingBehavior: 'none',
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: false,
      androidBiometric: { biometricAuth: false },
    },
  },
};

export default config;
