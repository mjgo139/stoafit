import type { FirebaseApp } from 'firebase/app';
import { GoogleAIBackend, Schema, getAI, getGenerativeModel } from 'firebase/ai';

/**
 * Lee una etiqueta nutricional con Gemini (Firebase AI Logic, Gemini Developer API, nivel gratuito).
 * Solo lo usan los cargadores. Se prueba primero el modelo que no requiere facturación.
 */
const MODELOS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];

const ESQUEMA = Schema.object({
  properties: {
    nombre: Schema.string({ description: 'Nombre del producto si se ve en la foto' }),
    marca: Schema.string({ description: 'Marca o empresa elaboradora' }),
    porcion: Schema.string({ description: 'Porción en medida casera, ej. "1½ unidad", "2 rodajas", "1 vaso"' }),
    gramos: Schema.number({ description: 'Gramos (o ml) de la porción' }),
    kcal: Schema.number({ description: 'Valor energético en kcal por porción (no kJ)' }),
    prot: Schema.number({ description: 'Proteínas en gramos por porción' }),
    carb: Schema.number({ description: 'Carbohidratos totales en gramos por porción' }),
    gras: Schema.number({ description: 'Grasas totales en gramos por porción' }),
  },
  optionalProperties: ['nombre', 'marca', 'porcion', 'gramos', 'kcal', 'prot', 'carb', 'gras'],
});

const PEDIDO = `Sos un lector de etiquetas nutricionales de alimentos envasados de Paraguay (formato MERCOSUR).
Leé la tabla "Información Nutricional" de la foto y devolvé SOLO los valores de la columna "Cantidad por porción" (no el %VD).
Usá punto decimal. La energía en kcal, no en kJ. Si la etiqueta da valores por 100 g en vez de por porción, usá porcion "100 g" y gramos 100.
Si un dato no se lee con seguridad, no lo inventes: dejalo afuera.`;

async function aBase64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function leerEtiquetaConGemini(app: FirebaseApp, foto: Blob): Promise<unknown> {
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  const datos = await aBase64(foto);
  let ultimo: unknown;
  for (const nombre of MODELOS) {
    try {
      const modelo = getGenerativeModel(ai, {
        model: nombre,
        generationConfig: { responseMimeType: 'application/json', responseSchema: ESQUEMA, temperature: 0 },
      });
      const r = await modelo.generateContent([PEDIDO, { inlineData: { mimeType: foto.type || 'image/jpeg', data: datos } }]);
      return JSON.parse(r.response.text());
    } catch (e) {
      ultimo = e;
      const m = String((e as Error)?.message ?? e);
      // Si el modelo no existe o no está habilitado, se prueba el siguiente; otros errores se informan
      if (!/404|not found|not supported|NOT_FOUND/i.test(m)) break;
    }
  }
  const m = String((ultimo as Error)?.message ?? ultimo);
  const code = /429|quota|RESOURCE_EXHAUSTED/i.test(m) ? 'ia/limite'
    : /403|PERMISSION|api-not-enabled|not been used|disabled|API key/i.test(m) ? 'ia/no-disponible' : 'ia/no-leyo';
  throw Object.assign(new Error(code), { code, detalle: m });
}
