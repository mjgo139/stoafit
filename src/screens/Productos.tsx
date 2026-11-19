import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { mensajeError } from '../data/repo';
import { fechaCorta, formatoNumero } from '../lib/logica';
import { etiquetaDe, macrosDe } from '../lib/nutricion';
import { CODIGO_VALIDO, alimentoDeProducto } from '../lib/productos';
import type { Cargador, Producto, Reporte } from '../lib/tipos';
import { FormEtiqueta } from '../ui/alimento';
import { useSesion } from '../ui/contexto';
import { Grupo } from '../ui/familia';
import { Icono } from '../ui/Icono';
import { Cargando, Encabezado, Hoja, Selector, Vacio } from '../ui/piezas';
import { useProductos } from '../ui/usarProductos';

type Vista = 'reportes' | 'sin-verificar' | 'cargadores';

/** Panel de la base compartida: reportes, productos sin verificar y (admin) cargadores */
export default function Productos() {
  const { repo, usuario, admin, cargador, aviso } = useSesion();
  const productos = useProductos();
  const [vista, setVista] = useState<Vista>('reportes');
  const [reportes, setReportes] = useState<Reporte[] | null>(null);
  const [pendientes, setPendientes] = useState<Producto[] | null>(null);
  const [cargadores, setCargadores] = useState<Cargador[] | null>(null);
  const [editar, setEditar] = useState<Producto | null>(null);
  const [buscar, setBuscar] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const recargar = useCallback(() => {
    repo.leerReportes().then(setReportes).catch(() => setReportes([]));
    repo.leerSinVerificar().then(setPendientes).catch(() => setPendientes([]));
    if (admin) repo.leerCargadores().then(setCargadores).catch(() => setCargadores([]));
  }, [repo, admin]);
  useEffect(() => { if (cargador) recargar(); }, [cargador, recargar]);

  if (!cargador) return <Navigate to="/perfil" replace />;

  async function abrir(codigo: string) {
    setError('');
    const p = await repo.leerProducto(codigo).catch(() => null);
    if (p) setEditar(p);
    else setError(`El código ${codigo} todavía no está cargado.`);
  }

  async function verificar(p: Producto) {
    await repo.guardarProducto({ ...p, verificado: true, verificadoPor: usuario.uid, actualizado: Date.now() });
    aviso(`${p.nombre} quedó verificado`);
    recargar();
  }

  const opciones: { v: Vista; t: string }[] = [
    { v: 'reportes', t: `Reportes${reportes?.length ? ` (${reportes.length})` : ''}` },
    { v: 'sin-verificar', t: `Sin verificar${pendientes?.length ? ` (${pendientes.length})` : ''}` },
    ...(admin ? [{ v: 'cargadores' as const, t: 'Cargadores' }] : []),
  ];

  return (
    <div className="lg:mx-auto lg:max-w-[960px]">
      <Encabezado atras etiqueta="Base compartida" titulo="Productos" linea="Un código de barras = un producto, igual para todos los usuarios." />

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const c = buscar.replace(/\D/g, ''); if (CODIGO_VALIDO.test(c)) abrir(c); }}>
        <input className="campo flex-1" inputMode="numeric" placeholder="Buscar por código: 7840…" value={buscar}
          onChange={(e) => setBuscar(e.target.value.replace(/\D/g, '').slice(0, 14))} aria-label="Buscar producto por código" />
        <button className="btn h-12 shrink-0 px-4 text-[12px]" disabled={!CODIGO_VALIDO.test(buscar)}>Abrir</button>
      </form>
      {error && <p className="mt-2 text-[13px] text-miss" role="alert">{error}</p>}

      <div className="mt-5"><Selector<Vista> nombre="Vista" valor={vista} alCambiar={setVista} opciones={opciones} /></div>

      <div className="mt-5">
        {vista === 'reportes' && (!reportes ? <Cargando /> : reportes.length === 0 ? (
          <Vacio titulo="Sin reportes" linea="Cuando alguien avise que un producto tiene un error, aparece acá." />
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2" aria-label="Reportes">
            {reportes.map((r) => (
              <li key={r.id} className="tarjeta" data-testid="reporte">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{r.nombre}</div>
                    <div className="text-[12px] text-mu">Código {r.codigo} · {fechaCorta(r.fecha)}</div>
                    <p className="mt-2 text-[14px]">“{r.motivo}”</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="btn h-10 flex-1 px-3 text-[12px]" onClick={() => abrir(r.codigo)}>Revisar</button>
                  <button className="btn-sec h-10 flex-1 text-[13px]" onClick={async () => { await repo.borrarReporte(r.id); aviso('Reporte archivado'); recargar(); }}>Archivar</button>
                </div>
              </li>
            ))}
          </ul>
        ))}

        {vista === 'sin-verificar' && (!pendientes ? <Cargando /> : pendientes.length === 0 ? (
          <Vacio titulo="Todo verificado" linea="Los productos que cargan los usuarios comunes aparecen acá hasta que un cargador los revise." />
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2" aria-label="Productos sin verificar">
            {pendientes.map((p) => {
              const a = alimentoDeProducto(p);
              const m = macrosDe(a, a.porciones[0].gramos);
              return (
                <li key={p.codigo} className="tarjeta" data-testid="pendiente">
                  <div className="font-semibold">{p.nombre}{p.marca ? <span className="font-normal text-mu"> · {p.marca}</span> : null}</div>
                  <div className="text-[12px] text-mu">Código {p.codigo} · cargado el {fechaCorta(p.creado)}</div>
                  <div className="mt-1 text-[13px]">{a.porciones[0].nombre}: <b>{formatoNumero(m.kcal)} kcal</b> · P {formatoNumero(m.prot, 1)} · C {formatoNumero(m.carb, 1)} · G {formatoNumero(m.gras, 1)}</div>
                  <div className="mt-3 flex gap-2">
                    <button className="btn h-10 flex-1 px-3 text-[12px]" onClick={() => verificar(p)}><Icono n="check" size={15} />Está bien</button>
                    <button className="btn-sec h-10 flex-1 text-[13px]" onClick={() => setEditar(p)}>Corregir</button>
                  </div>
                </li>
              );
            })}
          </ul>
        ))}

        {vista === 'cargadores' && admin && (
          <section>
            <Grupo n={1} className="mb-3">Usuarios cargadores</Grupo>
            <p className="mb-3 text-[14px] text-mu">Pueden leer etiquetas con foto (IA) y corregir o verificar productos. Vos, como admin, también.</p>
            <form className="flex gap-2" onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              try { const c = await repo.agregarCargador(email); setEmail(''); aviso(`${c.nombre} ahora es cargador`); recargar(); } catch (er) { setError(mensajeError(er)); }
            }}>
              <input className="campo flex-1" type="email" placeholder="Correo de la cuenta" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Correo del nuevo cargador" />
              <button className="btn h-12 shrink-0 px-4 text-[12px]" disabled={!email.includes('@')}>Hacer cargador</button>
            </form>
            {!cargadores ? <Cargando /> : cargadores.length === 0 ? <p className="mt-4 text-[14px] text-mu">Todavía no hay cargadores.</p> : (
              <ul className="tarjeta mt-4 py-1" aria-label="Cargadores">
                {cargadores.map((c) => (
                  <li key={c.uid} className="fila last:border-0" data-testid="cargador">
                    <span className="min-w-0 flex-1 py-2"><b className="block truncate">{c.nombre}</b><span className="block truncate text-[12px] text-mu">{c.email}</span></span>
                    <button className="chip h-8 px-3 text-[12px]" onClick={async () => { await repo.quitarCargador(c.uid); aviso(`${c.nombre} ya no es cargador`); recargar(); }}>Quitar</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <Hoja abierta={!!editar} alCerrar={() => setEditar(null)} etiqueta={editar ? `Código ${editar.codigo}` : ''} titulo="Corregir producto">
        {editar && (
          <>
            <p className="mb-3 text-[13px] text-mu">{editar.verificado ? 'Verificado' : 'Sin verificar'} · cargado {editar.via === 'foto' ? 'con foto' : 'a mano'} el {fechaCorta(editar.creado)}</p>
            <FormEtiqueta key={editar.codigo} inicial={etiquetaDe(alimentoDeProducto(editar))} codigoFijo={editar.codigo} leerFoto={productos.leerFoto}
              textoGuardar="Guardar y verificar"
              alBorrar={async () => { await repo.borrarProducto(editar.codigo); setEditar(null); aviso('Producto borrado'); recargar(); }}
              alGuardar={async (e, via) => {
                try {
                  const a = await productos.corregir(editar.codigo, e, via);
                  setEditar(null);
                  aviso(`${a.nombre} quedó corregido y verificado`);
                  recargar();
                } catch (er) { aviso(mensajeError(er)); }
              }} />
          </>
        )}
      </Hoja>
    </div>
  );
}
