// Genera los íconos de StoaFit (familia Stoica: laurel dorado + manzana marfil en vez de letra) en PNG para la web y Android.
// Uso: PW_CHROME=/usr/bin/google-chrome node scripts/iconos.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const hojas = [[13, 34, -25], [12, 54, -50], [17, 73, -65], [28, 89, -80], [119, 34, 25], [120, 54, 50], [115, 73, 65], [104, 89, 80]];
// Hojitas interiores, como en el ícono de Stoica
const interiores = [[27, 41, 25], [28, 60, 8], [105, 41, -25], [104, 60, -8]];
const laurel = `<g transform="translate(110.8 115) scale(2.2)">
  <g fill="none" stroke="#C9A66B" stroke-width="2" stroke-linecap="round"><path d="M58 108C26 98 12 66 20 24"/><path d="M74 108c32-10 46-42 38-84"/></g>
  <g fill="#C9A66B">${hojas.map(([x, y, g]) => `<ellipse cx="${x}" cy="${y}" rx="4.6" ry="10.5" transform="rotate(${g} ${x} ${y})"/>`).join('')}${interiores.map(([x, y, g]) => `<ellipse cx="${x}" cy="${y}" rx="3.6" ry="7.6" transform="rotate(${g} ${x} ${y})"/>`).join('')}</g></g>`;

/** forma: 'cuadrado' (redondeado) | 'circulo' | 'lleno' (sin bordes, para el fondo del sistema) */
// Manzana marfil al centro, del mismo peso visual que la letra de Stoica (≈100 px de alto)
const manzana = `<g transform="translate(198.5 184) scale(1.15)">
  <path fill="#F3EDDF" d="M50 36C41 28 22 27 15 44c-7 17 2 43 15 52 6 4 12 4 16 2 2.5-1.2 5.5-1.2 8 0 4 2 10 2 16-2 13-9 22-35 15-52-7-17-26-16-35-8Z"/>
  <path fill="none" stroke="#F3EDDF" stroke-width="5" stroke-linecap="round" d="M50 36c0-9 2-16 7-21"/>
  <path fill="#C9A66B" d="M57 19c4-10 14-14 24-12-2 10-12 16-24 12Z"/>
</g>`;

export function svg(forma = 'cuadrado') {
  const fondo = forma === 'circulo' ? '<circle cx="256" cy="256" r="256" fill="#14120E"/>'
    : forma === 'lleno' ? '<rect width="512" height="512" fill="#14120E"/>'
    : forma === 'frente' ? ''
    : '<rect width="512" height="512" rx="112" fill="#14120E"/>';
  // v1.6.1: laurel y manzana agrandados ×1,42 desde el centro (como el resto de la familia de íconos: mancuerna, check, libro, busto)
  const dibujo = `<g transform="translate(256 256) scale(1.42) translate(-256 -256)">${laurel}${manzana}</g>`;
  // 'frente' = capa de adelante del ícono adaptable de Android (fondo transparente; el fondo #14120E lo pone Android).
  // El lienzo es de 108 dp y se ven 72 dp: el dibujo va al 72/108 para que la máscara del teléfono no lo corte.
  const contenido = forma === 'frente' ? `<g transform="translate(256 256) scale(${72 / 108}) translate(-256 -256)">${dibujo}</g>` : dibujo;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${fondo}${contenido}</svg>`;
}

const navegador = await chromium.launch({ executablePath: process.env.PW_CHROME || undefined });
const pagina = await navegador.newPage();
async function png(forma, tam, ruta) {
  await pagina.setViewportSize({ width: tam, height: tam });
  await pagina.setContent(`<html><body style="margin:0;background:transparent">${svg(forma).replace('<svg ', `<svg width="${tam}" height="${tam}" `)}</body></html>`);
  await pagina.screenshot({ path: ruta, omitBackground: true });
}
await png('lleno', 512, 'public/icono-512.png');
await png('lleno', 192, 'public/icono-192.png');
for (const [d] of [['mdpi'], ['hdpi'], ['xhdpi'], ['xxhdpi'], ['xxxhdpi']]) mkdirSync(`android/app/src/main/res/mipmap-${d}`, { recursive: true });
for (const [d, t] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
  await png('lleno', t, `android/app/src/main/res/mipmap-${d}/ic_launcher.png`);
  await png('circulo', t, `android/app/src/main/res/mipmap-${d}/ic_launcher_round.png`);
  // Ícono adaptable (Android 8+) y pantalla de inicio de Android 12+: capa de adelante de 108 dp
  await png('frente', Math.round(t * 108 / 48), `android/app/src/main/res/mipmap-${d}/ic_launcher_foreground.png`);
}
// Ícono adaptable: fondo #14120E (values/ic_launcher_background.xml) + la capa de adelante. Sin esto Android 12+
// muestra el ícono cuadrado achicado adentro de un círculo blanco al abrir la app.
mkdirSync('android/app/src/main/res/mipmap-anydpi-v26', { recursive: true });
const adaptable = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
writeFileSync('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml', adaptable);
writeFileSync('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml', adaptable);
writeFileSync('public/icono.svg', svg('cuadrado'));

await navegador.close();
console.log('íconos listos');
