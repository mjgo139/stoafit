import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icono } from '../../familia/iconos';
import { useCerrarConAtras } from './atras';

/**
 * Cámara dentro de la app para sacar la foto de la etiqueta.
 * Por qué no se usa la cámara del sistema (<input capture>): en la APK, al abrir la app de cámara de Android,
 * el sistema puede cerrar StoaFit para liberar memoria; al volver, la app arranca de nuevo en Hoy y la foto se pierde.
 * Con la cámara adentro (getUserMedia, el mismo permiso CAMERA del escáner) la app nunca se va al fondo.
 * "Elegir de la galería" queda como alternativa (y si no hay cámara o no hay permiso).
 */
/** Imagen vacía: sin esto, el WebView de Android muestra un ícono gris de "reproducir" mientras arranca la cámara. */
export const SIN_POSTER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export function CamaraFoto({ alSacar, alCerrar }: { alSacar: (foto: Blob) => void; alCerrar: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const pista = useRef<MediaStreamTrack | null>(null);
  const [sacando, setSacando] = useState(false);
  const [estado, setEstado] = useState<'iniciando' | 'lista' | 'sin-camara' | 'denegado'>('iniciando');
  useCerrarConAtras(true, alCerrar);

  useEffect(() => {
    let vivo = true;
    let flujo: MediaStream | null = null;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setEstado('sin-camara'); return; }
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          // La mayor resolución que dé la cámara de atrás (la foto final sale con takePhoto, a resolución completa)
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 4096 }, height: { ideal: 2160 } }, audio: false,
        });
      } catch (e) {
        if (vivo) setEstado((e as DOMException)?.name === 'NotAllowedError' ? 'denegado' : 'sin-camara');
        return;
      }
      if (!vivo) { flujo.getTracks().forEach((x) => x.stop()); return; }
      pista.current = flujo.getVideoTracks()[0] ?? null;
      // Enfoque continuo si la cámara lo permite (las etiquetas se sacan de cerca)
      try { await pista.current?.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }); } catch { /* no lo soporta */ }
      const v = video.current!;
      v.srcObject = flujo;
      await v.play().catch(() => undefined);
      if (vivo) setEstado('lista');
    })();
    return () => { vivo = false; flujo?.getTracks().forEach((x) => x.stop()); };
  }, []);

  async function sacar() {
    const v = video.current;
    if (!v || !v.videoWidth || sacando) return;
    setSacando(true);
    navigator.vibrate?.(40);
    // Foto de verdad con la cámara (resolución completa, enfoque y exposición del teléfono), si el navegador lo permite
    const IC = (globalThis as unknown as { ImageCapture?: new (t: MediaStreamTrack) => { takePhoto: () => Promise<Blob> } }).ImageCapture;
    if (IC && pista.current) {
      try { const b = await new IC(pista.current).takePhoto(); if (b.size) { alSacar(b); return; } } catch { /* se usa el cuadro del video */ }
    }
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    c.toBlob((b) => { setSacando(false); if (b) alSacar(b); }, 'image/jpeg', 0.95);
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-[var(--icono-fondo)] text-lat-on" role="dialog" aria-label="Cámara para la etiqueta" data-testid="camara-foto">
      <div className="flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3">
        <span className="text-[15px] font-semibold">Foto de la etiqueta</span>
        <button className="flex h-11 w-11 items-center justify-center rounded-full" onClick={alCerrar} aria-label="Cerrar cámara"><Icono n="cerrar" size={22} /></button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={video} className={`absolute inset-0 h-full w-full object-cover transition-opacity ${estado === 'lista' ? 'opacity-100' : 'opacity-0'}`}
          playsInline muted autoPlay poster={SIN_POSTER} />
        {estado === 'lista' && (
          <div className="pointer-events-none absolute inset-x-6 top-[12%] bottom-[12%] rounded-[16px] border-2 border-lat-on/70" aria-hidden />
        )}
        {estado !== 'lista' && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-[15px]">
            {estado === 'iniciando' ? 'Abriendo la cámara…'
              : estado === 'denegado' ? 'StoaFit no tiene permiso para usar la cámara. Podés darle permiso en los ajustes del teléfono o elegir una foto de la galería.'
              : 'No se pudo abrir la cámara. Elegí una foto de la galería.'}
          </div>
        )}
      </div>
      <p className="px-6 pt-3 text-center text-[13.5px] text-lat-mu">Encuadrá la tabla "Información Nutricional", de cerca y sin brillo.</p>
      <div className="flex items-center justify-between gap-3 px-6 pt-4 pb-[max(22px,env(safe-area-inset-bottom))]">
        <button className="flex h-11 items-center gap-2 rounded-[12px] px-2 text-[15px]" onClick={() => galeria.current?.click()}>
          Galería
        </button>
        <button className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-lat-on disabled:opacity-40"
          onClick={sacar} disabled={estado !== 'lista' || sacando} aria-label="Sacar foto" data-testid="sacar-foto">
          <span className="h-[54px] w-[54px] rounded-full bg-[var(--lat-tx-on)]" />
        </button>
        <span className="w-[88px]" aria-hidden />
      </div>
      <input ref={galeria} type="file" accept="image/*" className="hidden" aria-label="Elegir foto de la galería"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) alSacar(f); e.target.value = ''; }} />
    </div>,
    document.body,
  );
}
