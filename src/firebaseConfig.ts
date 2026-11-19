// Configuración PÚBLICA de la app web de Firebase (no es secreta: identifica el proyecto).
// La seguridad la dan las reglas de Firestore, no estos datos.
export const firebaseConfig = {
  apiKey: 'AIzaSyDww1oYXSqPTt40QkTGaGmXAMu7693rqR8',
  authDomain: 'stoafit-app.firebaseapp.com',
  projectId: 'stoafit-app',
  storageBucket: 'stoafit-app.firebasestorage.app',
  messagingSenderId: '390256309581',
  appId: '1:390256309581:web:b130a911418476bcf9b304',
};

/** Hasta que se cargue la configuración, la app funciona en modo prueba */
export const firebaseListo = Boolean(firebaseConfig.apiKey && firebaseConfig.appId);
