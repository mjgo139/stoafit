import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/playfair-display/500.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/700.css';
import './index.css';
import App from './App';
import { ProveedorApp } from './ui/contexto';
import { crearRepo } from './data/crear';
import { registrarServiceWorker } from './ui/actualizar';
import { guardarInvitacionDeLaUrl } from './pro/invitacion';

guardarInvitacionDeLaUrl();
registrarServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorApp repo={crearRepo()}>
        <App />
      </ProveedorApp>
    </BrowserRouter>
  </StrictMode>,
);
