import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, getDocs, collection, limit, query, setDoc, updateDoc, where } from 'firebase/firestore';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-stoafit',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const perfil = (uid: string) => ({
  uid, nombre: 'Ana', email: 'ana@ejemplo.com', tema: 'sistema', unidad: 'kg',
  recordatorio: { activo: false, hora: '12:00', dias: [1] }, creado: 1, resumen: { dias: [], cumplidos: [], total: 0 },
});
const item = { id: 'i1', alimentoId: 'chipa', nombre: 'Chipa', cantidad: 1, porcion: '1 unidad mediana', gramos: 60, kcal: 198, prot: 5.4, carb: 24, gras: 9 };
const dia = (fecha = '2026-11-18') => ({ fecha, comidas: { desayuno: [item] }, agua: 500, totales: { kcal: 198, prot: 5.4, carb: 24, gras: 9 }, actualizado: 1 });

describe('reglas de Firestore', () => {
  it('sin sesión no se lee ni se escribe nada', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'users/ana')));
    await assertFails(setDoc(doc(db, 'users/ana'), perfil('ana')));
    await assertFails(getDoc(doc(db, 'config/admins')));
  });

  it('cada uno lee y escribe su perfil', async () => {
    const db = env.authenticatedContext('ana').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/ana'), perfil('ana')));
    await assertSucceeds(getDoc(doc(db, 'users/ana')));
    await assertSucceeds(setDoc(doc(db, 'users/ana'), { tema: 'oscuro' }, { merge: true }));
    await assertSucceeds(setDoc(doc(db, 'users/ana'), { metas: { kcal: 1800, prot: 90, carb: 200, gras: 60, agua: 2000 }, metasManual: true }, { merge: true }));
    await assertSucceeds(setDoc(doc(db, 'users/ana'), { genero: 'mujer', actividad: 'moderado', objetivo: 'bajar', acento: 'oliva', favoritos: ['chipa'] }, { merge: true }));
    await assertFails(setDoc(doc(db, 'users/ana'), { objetivo: 'volar' }, { merge: true }));
    await assertFails(setDoc(doc(db, 'users/ana'), { metas: { kcal: -5 } }, { merge: true }));
  });

  it('nadie lee ni escribe el perfil de otro', async () => {
    await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), 'users/ana'), perfil('ana')); });
    const beto = env.authenticatedContext('beto').firestore();
    await assertFails(getDoc(doc(beto, 'users/ana')));
    await assertFails(setDoc(doc(beto, 'users/ana'), { nombre: 'X' }, { merge: true }));
    await assertFails(deleteDoc(doc(beto, 'users/ana')));
  });

  it('rechaza campos o valores no permitidos en el perfil', async () => {
    const db = env.authenticatedContext('ana').firestore();
    await assertFails(setDoc(doc(db, 'users/ana'), { ...perfil('ana'), admin: true }));
    await assertFails(setDoc(doc(db, 'users/ana'), { ...perfil('ana'), tema: 'rosa' }));
    await assertFails(setDoc(doc(db, 'users/ana'), { ...perfil('ana'), uid: 'otro' }));
  });

  it('subcolecciones: solo el dueño', async () => {
    const ana = env.authenticatedContext('ana').firestore();
    const beto = env.authenticatedContext('beto').firestore();
    await assertSucceeds(setDoc(doc(ana, 'users/ana/days/2026-11-18'), dia()));
    await assertSucceeds(setDoc(doc(ana, 'users/ana/bodyLogs/2026-11-18'), { fecha: 1, peso: 68 }));
    await assertSucceeds(setDoc(doc(ana, 'users/ana/customFoods/p1'), { nombre: 'Guiso de la abuela', grupo: 'tipicos', por100: { kcal: 150, prot: 6, carb: 22, gras: 4 }, porciones: [{ nombre: '1 plato', gramos: 300 }] }));
    await assertSucceeds(setDoc(doc(ana, 'users/ana/plans/pl1'), { nombre: 'Mi semana', comidas: { desayuno: 'Cocido' }, creado: 1 }));
    await assertSucceeds(setDoc(doc(ana, 'users/ana/customFoods/p3'), { nombre: 'Galletitas', grupo: 'envasados', codigo: '7840000000017', por100: { kcal: 420, prot: 11, carb: 68, gras: 11 }, porciones: [{ nombre: '100 g', gramos: 100 }] }));
    await assertFails(setDoc(doc(ana, 'users/ana/customFoods/p4'), { nombre: 'x', por100: { kcal: 1 }, porciones: [], codigo: '1234567890123456789' }));
    await assertSucceeds(setDoc(doc(ana, 'users/ana/customFoods/r1'), { nombre: 'Sopa de mamá', grupo: 'recetas', por100: { kcal: 290, prot: 9, carb: 28, gras: 16 }, porciones: [{ nombre: '1 porción', gramos: 120 }], receta: { ingredientes: [item], porciones: 8 } }));
    await assertSucceeds(setDoc(doc(ana, 'users/ana/savedMeals/g1'), { nombre: 'Mi desayuno', items: [item], creado: 1 }));
    await assertFails(setDoc(doc(ana, 'users/ana/savedMeals/g2'), { nombre: '', items: [], creado: 1 }));
    await assertFails(setDoc(doc(beto, 'users/ana/savedMeals/g3'), { nombre: 'x', items: [], creado: 1 }));
    await assertFails(getDocs(collection(beto, 'users/ana/savedMeals')));
    await assertSucceeds(getDocs(collection(ana, 'users/ana/days')));
    await assertFails(getDocs(collection(beto, 'users/ana/days')));
    await assertFails(getDoc(doc(beto, 'users/ana/bodyLogs/2026-11-18')));
    await assertFails(setDoc(doc(beto, 'users/ana/days/2026-11-19'), dia('2026-11-19')));
    await assertFails(setDoc(doc(beto, 'users/ana/customFoods/p2'), { nombre: 'x', por100: { kcal: 1 }, porciones: [] }));
  });

  it('colecciones desconocidas quedan cerradas', async () => {
    const ana = env.authenticatedContext('ana').firestore();
    await assertFails(setDoc(doc(ana, 'users/ana/otra/x'), { a: 1 }));
    await assertFails(setDoc(doc(ana, 'publico/x'), { a: 1 }));
  });

  it('días mal formados se rechazan', async () => {
    const ana = env.authenticatedContext('ana').firestore();
    await assertFails(setDoc(doc(ana, 'users/ana/days/2026-11-18'), dia('2026-11-17')));
    await assertFails(setDoc(doc(ana, 'users/ana/days/ayer'), dia('ayer')));
    await assertFails(setDoc(doc(ana, 'users/ana/days/2026-11-18'), { ...dia(), agua: 50000 }));
    await assertSucceeds(setDoc(doc(ana, 'users/ana/days/2026-11-18'), { ...dia(), comidas: { 'c-pre1': [item] } }));
    await assertFails(setDoc(doc(ana, 'users/ana/days/2026-11-18'), { ...dia(), comidas: Object.fromEntries(Array.from({ length: 16 }, (_, i) => [`c-${i}`, []])) }));
  });

  it('la lista de admins se lee con sesión pero nadie la escribe desde la app', async () => {
    const ana = env.authenticatedContext('ana').firestore();
    await assertSucceeds(getDoc(doc(ana, 'config/admins')));
    await assertFails(setDoc(doc(ana, 'config/admins'), { uids: ['ana'] }));
  });

  describe('base compartida de productos (un código = un producto)', () => {
    // ana = admin · carla = cargadora · beto = usuario común
    const prod = (codigo: string, uid: string, verificado = false) => ({
      codigo, nombre: 'Galletitas', marca: 'X', por100: { kcal: 420, prot: 11, carb: 68, gras: 11 },
      porciones: [{ nombre: '100 g', gramos: 100 }], verificado, creadoPor: uid, creado: 1, actualizado: 1, via: 'manual',
    });
    async function preparar() {
      await env.withSecurityRulesDisabled(async (c) => {
        const db = c.firestore();
        await setDoc(doc(db, 'config/admins'), { uids: ['ana'] });
        await setDoc(doc(db, 'config/cargadores'), { uids: ['carla'], info: { carla: { nombre: 'Carla', email: 'carla@ejemplo.com' } } });
        await setDoc(doc(db, 'users/beto'), { ...perfil('beto'), email: 'beto@ejemplo.com' });
      });
    }

    it('un usuario común crea un producto "sin verificar" con el código como id, y nada más', async () => {
      await preparar();
      const beto = env.authenticatedContext('beto').firestore();
      await assertSucceeds(setDoc(doc(beto, 'productos/7840000000017'), prod('7840000000017', 'beto')));
      await assertSucceeds(getDoc(doc(beto, 'productos/7840000000017')));
      // no puede crearlo verificado, ni a nombre de otro, ni con un código distinto al id o inválido
      await assertFails(setDoc(doc(beto, 'productos/7840000000024'), prod('7840000000024', 'beto', true)));
      await assertFails(setDoc(doc(beto, 'productos/7840000000031'), prod('7840000000031', 'carla')));
      await assertFails(setDoc(doc(beto, 'productos/7840000000048'), prod('7840000000055', 'beto')));
      await assertFails(setDoc(doc(beto, 'productos/abc'), prod('abc', 'beto')));
      // un código = un producto: si ya existe, no lo puede pisar ni corregir ni borrar
      await assertFails(setDoc(doc(beto, 'productos/7840000000017'), { ...prod('7840000000017', 'beto'), nombre: 'Otro' }));
      await assertFails(deleteDoc(doc(beto, 'productos/7840000000017')));
      // sin sesión no se lee
      await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'productos/7840000000017')));
    });

    it('v1.15.0: alimento compartido sin código (llave n-…) y prefijos para buscar por nombre', async () => {
      await preparar();
      const beto = env.authenticatedContext('beto').firestore();
      await assertSucceeds(setDoc(doc(beto, 'productos/n-abc123def4'), { ...prod('n-abc123def4', 'beto'), prefijos: ['chi', 'chip', 'chipa'] }));
      await assertFails(setDoc(doc(beto, 'productos/n-ABC'), prod('n-ABC', 'beto')));
      await assertFails(setDoc(doc(beto, 'productos/n-abc123def5'), { ...prod('n-abc123def5', 'beto'), prefijos: 'chipa' }));
    });

    it('cargadores y admin corrigen y verifican; el código no cambia', async () => {
      await preparar();
      const beto = env.authenticatedContext('beto').firestore();
      const carla = env.authenticatedContext('carla').firestore();
      const ana = env.authenticatedContext('ana').firestore();
      await setDoc(doc(beto, 'productos/7840000000017'), prod('7840000000017', 'beto'));
      await assertSucceeds(setDoc(doc(carla, 'productos/7840000000017'), { ...prod('7840000000017', 'beto', true), verificadoPor: 'carla' }));
      await assertSucceeds(setDoc(doc(carla, 'productos/7840000000024'), prod('7840000000024', 'carla', true)));
      await assertFails(setDoc(doc(carla, 'productos/7840000000017'), { ...prod('7840000000099', 'beto', true) }));
      await assertSucceeds(getDocs(query(collection(carla, 'productos'), where('verificado', '==', false))));
      await assertSucceeds(deleteDoc(doc(ana, 'productos/7840000000024')));
    });

    it('reportes: los crea cualquiera; los ven y borran cargadores', async () => {
      await preparar();
      const beto = env.authenticatedContext('beto').firestore();
      const carla = env.authenticatedContext('carla').firestore();
      const r = { codigo: '7840000000017', nombre: 'Galletitas', motivo: 'Calorías mal', uid: 'beto', fecha: 1 };
      await assertSucceeds(setDoc(doc(beto, 'reportes/r1'), r));
      await assertFails(setDoc(doc(beto, 'reportes/r2'), { ...r, uid: 'carla' }));
      await assertFails(getDocs(collection(beto, 'reportes')));
      await assertSucceeds(getDocs(collection(carla, 'reportes')));
      await assertSucceeds(deleteDoc(doc(carla, 'reportes/r1')));
    });

    it('cargadores: los marca solo el admin; el admin busca cuentas por correo de a una', async () => {
      await preparar();
      const beto = env.authenticatedContext('beto').firestore();
      const ana = env.authenticatedContext('ana').firestore();
      await assertSucceeds(getDoc(doc(beto, 'config/cargadores')));
      await assertFails(setDoc(doc(beto, 'config/cargadores'), { uids: ['beto'], info: {} }));
      await assertSucceeds(setDoc(doc(ana, 'config/cargadores'), { uids: ['carla', 'beto'], info: {} }));
      await assertSucceeds(getDocs(query(collection(ana, 'users'), where('email', '==', 'beto@ejemplo.com'), limit(1))));
      await assertFails(getDocs(query(collection(ana, 'users'), where('email', '==', 'beto@ejemplo.com'))));
      await assertFails(getDocs(query(collection(beto, 'users'), where('email', '==', 'ana@ejemplo.com'), limit(1))));
    });
  });

  describe('profesionales y clientes', () => {
    // ana = admin · pepe = nutricionista activa · beto = cliente de pepe · zoe = otra persona
    const vinculo = (extra = {}) => ({
      id: 'pepe_beto', profesionalId: 'pepe', clienteId: 'beto', tipo: 'nutricionista',
      nombreProfesional: 'Pepe', nombreCliente: 'Beto', codigo: 'NUT-PEPE', desde: 1, activo: true, ...extra,
    });
    async function preparar(activo = true) {
      await env.withSecurityRulesDisabled(async (c) => {
        const db = c.firestore();
        await setDoc(doc(db, 'config/admins'), { uids: ['ana'] });
        await setDoc(doc(db, 'profesionales/pepe'), { uid: 'pepe', tipo: 'nutricionista', nombre: 'Pepe', codigo: 'NUT-PEPE', activo, alta: 1 });
        await setDoc(doc(db, 'codigos/NUT-PEPE'), { codigo: 'NUT-PEPE', profesionalId: 'pepe', tipo: 'nutricionista', nombre: 'Pepe' });
        await setDoc(doc(db, 'users/beto'), perfil('beto'));
        await setDoc(doc(db, 'users/beto/days/2026-11-18'), dia());
      });
    }

    it('solo el admin da de alta profesionales; nadie se nombra a sí mismo', async () => {
      await preparar();
      const zoe = env.authenticatedContext('zoe').firestore();
      const ana = env.authenticatedContext('ana').firestore();
      await assertFails(setDoc(doc(zoe, 'profesionales/zoe'), { uid: 'zoe', activo: true }));
      await assertFails(setDoc(doc(zoe, 'codigos/NUT-ZOE1'), { profesionalId: 'zoe' }));
      await assertSucceeds(setDoc(doc(ana, 'profesionales/zoe'), { uid: 'zoe', activo: true }));
      // pedir ser profesional sí lo puede cualquiera, en estado pendiente
      await assertSucceeds(setDoc(doc(zoe, 'solicitudes/zoe'), { uid: 'zoe', tipo: 'nutricionista', nombre: 'Zoe', email: 'z@e.com', fecha: 1, estado: 'pendiente' }));
      await assertFails(setDoc(doc(zoe, 'solicitudes/zoe'), { uid: 'zoe', tipo: 'nutricionista', nombre: 'Zoe', email: 'z@e.com', fecha: 1, estado: 'aprobada' }));
      await assertFails(getDocs(collection(zoe, 'solicitudes')));
      await assertSucceeds(getDocs(collection(ana, 'solicitudes')));
    });

    it('sin vínculo la nutricionista no ve nada del cliente', async () => {
      await preparar();
      const pepe = env.authenticatedContext('pepe').firestore();
      await assertFails(getDoc(doc(pepe, 'users/beto')));
      await assertFails(getDocs(collection(pepe, 'users/beto/days')));
    });

    it('el cliente se vincula con el código y la nutricionista pasa a ver sus datos', async () => {
      await preparar();
      const beto = env.authenticatedContext('beto').firestore();
      const pepe = env.authenticatedContext('pepe').firestore();
      const zoe = env.authenticatedContext('zoe').firestore();
      // código equivocado o vínculo a nombre de otro: no
      await assertFails(setDoc(doc(beto, 'vinculos/pepe_beto'), vinculo({ codigo: 'NUT-NADA' })));
      await assertFails(setDoc(doc(zoe, 'vinculos/pepe_beto'), vinculo()));
      await assertSucceeds(setDoc(doc(beto, 'vinculos/pepe_beto'), vinculo()));
      await assertSucceeds(getDoc(doc(pepe, 'users/beto')));
      await assertSucceeds(getDocs(collection(pepe, 'users/beto/days')));
      await assertSucceeds(getDocs(query(collection(pepe, 'vinculos'), where('profesionalId', '==', 'pepe'), where('activo', '==', true))));
      await assertSucceeds(getDocs(query(collection(beto, 'vinculos'), where('clienteId', '==', 'beto'), where('activo', '==', true))));
      // ver no es cambiar: la nutricionista no toca el diario ni el perfil
      await assertFails(setDoc(doc(pepe, 'users/beto/days/2026-11-19'), dia('2026-11-19')));
      await assertFails(setDoc(doc(pepe, 'users/beto'), { nombre: 'X' }, { merge: true }));
      // otra persona sigue sin ver nada
      await assertFails(getDoc(doc(zoe, 'users/beto')));
      await assertFails(getDocs(query(collection(zoe, 'vinculos'), where('profesionalId', '==', 'pepe'))));
    });

    it('planes asignados: los maneja la nutricionista; el cliente no los cambia', async () => {
      await preparar();
      const beto = env.authenticatedContext('beto').firestore();
      const pepe = env.authenticatedContext('pepe').firestore();
      await setDoc(doc(beto, 'vinculos/pepe_beto'), vinculo());
      const pl = { nombre: 'Plan 1800', comidas: { desayuno: 'Cocido + chipa' }, creado: 1, asignadaPor: 'pepe', nombreAsignador: 'Pepe' };
      await assertSucceeds(setDoc(doc(pepe, 'users/beto/plans/pa'), pl));
      await assertFails(setDoc(doc(pepe, 'users/beto/plans/pb'), { ...pl, asignadaPor: 'otro' }));
      await assertFails(setDoc(doc(beto, 'users/beto/plans/pa'), { ...pl, nombre: 'Cambiado' }));
      await assertFails(setDoc(doc(beto, 'users/beto/plans/pc'), pl));
      await assertSucceeds(setDoc(doc(beto, 'users/beto/plans/propio'), { nombre: 'Mío', comidas: {}, creado: 1 }));
      await assertFails(setDoc(doc(pepe, 'users/beto/plans/propio'), { nombre: 'Mío', comidas: {}, creado: 1, asignadaPor: 'pepe' }));
      await assertFails(deleteDoc(doc(pepe, 'users/beto/plans/propio')));
      await assertSucceeds(deleteDoc(doc(pepe, 'users/beto/plans/pa')));
    });

    it('comentarios y objetivos', async () => {
      await preparar();
      const beto = env.authenticatedContext('beto').firestore();
      const pepe = env.authenticatedContext('pepe').firestore();
      await setDoc(doc(beto, 'vinculos/pepe_beto'), vinculo());
      const c = { autorId: 'pepe', autorNombre: 'Pepe', texto: 'Bien ahí', fecha: 1, leido: false };
      await assertSucceeds(setDoc(doc(pepe, 'users/beto/comments/k1'), c));
      await assertFails(setDoc(doc(pepe, 'users/beto/comments/k2'), { ...c, autorId: 'beto' }));
      await assertSucceeds(updateDoc(doc(beto, 'users/beto/comments/k1'), { leido: true }));
      await assertFails(updateDoc(doc(beto, 'users/beto/comments/k1'), { texto: 'otra cosa' }));
      await assertSucceeds(setDoc(doc(beto, 'users/beto/comments/k3'), { ...c, autorId: 'beto', autorNombre: 'Beto' }));
      const o = { tipo: 'frecuencia', titulo: '3 por semana', meta: 3, creadoPor: 'pepe', fecha: 1 };
      await assertSucceeds(setDoc(doc(pepe, 'users/beto/goals/o1'), o));
      await assertFails(setDoc(doc(beto, 'users/beto/goals/o2'), { ...o, creadoPor: 'beto' }));
      await assertSucceeds(getDocs(collection(beto, 'users/beto/goals')));
    });

    it('al cortar el vínculo o dar de baja a la nutricionista, deja de ver', async () => {
      await preparar();
      const beto = env.authenticatedContext('beto').firestore();
      const pepe = env.authenticatedContext('pepe').firestore();
      await setDoc(doc(beto, 'vinculos/pepe_beto'), vinculo());
      await assertFails(updateDoc(doc(pepe, 'vinculos/pepe_beto'), { activo: true, clienteId: 'zoe' }));
      await assertSucceeds(updateDoc(doc(beto, 'vinculos/pepe_beto'), { activo: false, hasta: 2 }));
      await assertFails(getDoc(doc(pepe, 'users/beto')));
      // se vuelve a vincular, y el admin lo da de baja
      await assertSucceeds(setDoc(doc(beto, 'vinculos/pepe_beto'), vinculo()));
      await assertSucceeds(getDoc(doc(pepe, 'users/beto')));
      await env.withSecurityRulesDisabled(async (x) => { await updateDoc(doc(x.firestore(), 'profesionales/pepe'), { activo: false }); });
      await assertFails(getDoc(doc(pepe, 'users/beto')));
    });

    it('con una nutricionista dada de baja no se puede vincular', async () => {
      await preparar(false);
      const beto = env.authenticatedContext('beto').firestore();
      await assertFails(setDoc(doc(beto, 'vinculos/pepe_beto'), vinculo()));
    });
  });
});

describe('escritorio/{codigo} · widget para Windows', () => {
  const C = 'abcdEFGH2345jkmnPQRS6789';
  const resumen = (uid: string, extra: Record<string, unknown> = {}) => ({ uid, t: '2|Ana|2026-11-26|10:00', actualizado: Date.now(), ...extra });
  it('el dueño lo crea y lo cambia; cualquiera con el código lo lee; nadie lo lista', async () => {
    const ana = env.authenticatedContext('ana').firestore();
    const nadie = env.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(ana, `escritorio/${C}`), resumen('ana')));
    await assertSucceeds(setDoc(doc(ana, `escritorio/${C}`), resumen('ana', { t: '2|Ana|2026-11-26|11:00' })));
    await assertSucceeds(getDoc(doc(nadie, `escritorio/${C}`)));
    await assertFails(getDocs(collection(nadie, 'escritorio')));
    await assertFails(getDocs(collection(ana, 'escritorio')));
  });
  it('otro no lo pisa ni lo borra; código corto, sin sesión o campos extra no', async () => {
    const ana = env.authenticatedContext('ana').firestore();
    const beto = env.authenticatedContext('beto').firestore();
    await assertSucceeds(setDoc(doc(ana, `escritorio/${C}`), resumen('ana')));
    await assertFails(setDoc(doc(beto, `escritorio/${C}`), resumen('beto')));
    await assertFails(deleteDoc(doc(beto, `escritorio/${C}`)));
    await assertFails(setDoc(doc(ana, 'escritorio/corto'), resumen('ana')));
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'escritorio/zzzzEFGH2345jkmnPQRS6789'), resumen('ana')));
    await assertFails(setDoc(doc(ana, 'escritorio/yyyyEFGH2345jkmnPQRS6789'), resumen('ana', { extra: 1 })));
    await assertFails(setDoc(doc(ana, 'escritorio/xxxxEFGH2345jkmnPQRS6789'), resumen('ana', { t: 'x'.repeat(2001) })));
    await assertSucceeds(deleteDoc(doc(ana, `escritorio/${C}`)));
  });
  it('el perfil guarda el código (24 letras) o null', async () => {
    const ana = env.authenticatedContext('ana').firestore();
    await assertSucceeds(setDoc(doc(ana, 'users/ana'), perfil('ana')));
    await assertSucceeds(setDoc(doc(ana, 'users/ana'), { escritorio: C }, { merge: true }));
    await assertSucceeds(setDoc(doc(ana, 'users/ana'), { escritorio: null }, { merge: true }));
    await assertFails(setDoc(doc(ana, 'users/ana'), { escritorio: 'corto' }, { merge: true }));
  });
});
