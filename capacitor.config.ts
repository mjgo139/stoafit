import type { CapacitorConfig } from '@capacitor/cli';

// La APK abre siempre la versión publicada en la web, así se actualiza sola en cada publicación.
// Si no hay conexión la primera vez, muestra public/sin-conexion.html (va dentro de la APK).
const config: CapacitorConfig = {
  appId: 'py.stoafit.app',
  appName: 'StoaFit',
  webDir: 'dist',
  server: {
    url: 'https://stoafit-app.web.app',
    errorPath: 'sin-conexion.html',
  },
  android: { backgroundColor: '#14120E' },
};

export default config;
