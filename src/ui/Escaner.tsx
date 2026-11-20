import { Capacitor } from '@capacitor/core';
import { useEffect, useRef, useState } from 'react';
import { codigoValido } from '../lib/openfoodfacts';
import { Icono } from './Icono';

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

/**
 * Crea el detector de códigos de barras:
 *  - Android (Chrome y la APK): el del sistema, rápido y sin descargar nada.
 *  - iPhone y otros: ZXing (WebAssembly), que se descarga recién al abrir el escáner.
 */
async function crearDetector(): Promise<Detector> {
  const nativo = (globalThis as unknown as { BarcodeDetector?: { new (o: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> } }).BarcodeDetector;
  if (nativo) {
    try {
      const sop = (await nativo.getSupportedFormats?.()) ?? FORMATOS;
      if (FORMATOS.some((f) => sop.includes(f))) return new nativo({ formats: FORMATOS.filter((f) => sop.includes(f)) });
    } catch { /* se usa ZXing */ }
  }
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasm }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ]);
  prepareZXingModule({ overrides: { locateFile: (ruta: string, prefijo: string) => (ruta.endsWith('.wasm') ? wasm : prefijo + ruta) } });
  return new BarcodeDetector({ formats: FORMATOS as never[] }) as unknown as Detector;
}

/** Escáner con la cámara de atrás. También se puede escribir el código a mano. */
export function Escaner({ alLeer }: { alLeer: (codigo: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<'iniciando' | 'buscando' | 'sin-camara' | 'denegado'>('iniciando');
  const [manual, setManual] = useState('');
  const leido = useRef(false);

  useEffect(() => {
    let vivo = true;
    let flujo: MediaStream | null = null;
    let t = 0;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setEstado('sin-camara'); return; }
      try {
        flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
      } catch (e) {
        if (vivo) setEstado((e as DOMException)?.name === 'NotAllowedError' ? 'denegado' : 'sin-camara');
        return;
      }
      if (!vivo) { flujo.getTracks().forEach((x) => x.stop()); return; }
      const v = video.current!;
      v.srcObject = flujo;
      await v.play().catch(() => undefined);
      let detector: Detector;
      try { detector = await crearDetector(); } catch { if (vivo) setEstado('sin-camara'); return; }
      if (!vivo) return;
      setEstado('buscando');
      const mirar = async () => {
        if (!vivo || leido.current) return;
        try {
          if (v.readyState >= 2) {
            const r = await detector.detect(v);
            const c = r.map((x) => codigoValido(x.rawValue)).find(Boolean);
            if (c && vivo && !leido.current) {
              leido.current = true;
              navigator.vibrate?.(60);
              alLeer(c);
              return;
            }
          }
        } catch { /* cuadro sin código */ }
        t = window.setTimeout(mirar, 180);
      };
      mirar();
    })();
    return () => { vivo = false; clearTimeout(t); flujo?.getTracks().forEach((x) => x.stop()); };
  }, [alLeer]);

  const valido = codigoValido(manual);
  return (
    <div>
      {estado !== 'sin-camara' && estado !== 'denegado' && (
        <div className="relative overflow-hidden rounded-[16px] bg-black" style={{ aspectRatio: '4 / 3' }}>
          <video ref={video} className="h-full w-full object-cover" playsInline muted aria-label="Cámara" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-[38%] w-[78%] rounded-[12px] border-2 border-white/80" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,.35)' }}>
              <span className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-[#C9A66B]" />
            </div>
          </div>
          <p className="absolute inset-x-0 bottom-3 text-center text-[13.5px] font-semibold text-white">
            {estado === 'iniciando' ? 'Abriendo la cámara…' : 'Apuntá al código de barras del envase'}
          </p>
        </div>
      )}
      {(estado === 'sin-camara' || estado === 'denegado') && (
        <div className="rounded-[12px] border border-dashed border-ln3 p-4 text-center text-[15px] text-mu" role="alert">
          <Icono n="alerta" className="mx-auto oro" />
          <p className="mt-2">{estado === 'denegado'
            ? (Capacitor.isNativePlatform()
              ? 'StoaFit no tiene permiso para usar la cámara. Activalo en Ajustes del teléfono → Aplicaciones → StoaFit → Permisos → Cámara, o escribí el código abajo.'
              : 'No diste permiso para usar la cámara. Podés activarlo en los ajustes del navegador, o escribir el código abajo.')
            : 'No encontramos una cámara en este dispositivo. Escribí el código que está debajo de las barras.'}</p>
        </div>
      )}
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (valido) alLeer(valido); }}>
        <input className="campo flex-1" inputMode="numeric" placeholder="O escribí el código: 7840…" value={manual}
          onChange={(e) => setManual(e.target.value.replace(/\D/g, '').slice(0, 14))} aria-label="Código de barras a mano" />
        <button className="btn h-12 shrink-0 px-4 text-[12.5px]" disabled={!valido}>Buscar</button>
      </form>
    </div>
  );
}
